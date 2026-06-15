import * as vscode from 'vscode';

const LOG_SELECTOR = { language: 'spec-log' };
const WELCOME_LINE_REGEXP = /^(\s*)(Welcome to "spec" Release)/;
const PROMPT_LINE_REGEXP = /^([0-9]+\.[A-Z][A-Z0-9]*>)\s+(.*)\s*$/;

/**
 * Regular expression that matches a line consisting of numbers and separating white spaces.
 * 
 * The following representations will be matched:
 * - integer: 123, -012, +0099
 * - digit: 1.0, -123.0, +123.02 (N/A: .111, 12.)
 * - power of base 10: 1e3, -2.0E-03, +0.1e+0 (N/A: 0.1e)
 */
const NUMBER_LINE_REGEXP = /^\s*([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?(?:\s+|$))+$/;

/**
 * Regular expression that matches a line consisting of number, time or date-and-time separated with white spaces.
 * 
 * The following representations will be matched:
 * - number
 *   - The patterns are the same as those in `NUMBER_LINE_REGEXP`.
 * - date
 *   - The fomart `date()` outputs, e.g., `Wed Jan 31 01:23:45 2024`
 *     - The format may depend on the Linux system on which spec is running. Only the format like the example above is supported.
 *   - ISO 8601 basic and extended formats, e.g., `2024-01-31T01:23:45+09:00`, `20240131T012345+0900`
 *     - The time zone can be omitted (though it is not compliant to ISO 8601).
 * - time
 *   - hours, minutes and seconds separated by a comma `:`, e.g., `01:23`, `1:23:45.7890`
 */
const DATETIME_LINE_REGEXP = new RegExp(
    '^\\s*((' +
    /[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/.source + '|' +
    /(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat) (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{1,2} \d{1,2}:\d{2}:\d{2} \d{4}/.source + '|' +
    /\d+:\d{2}(?::\d{2})?(?:[,.]\d+)?/.source + '|' +
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:[,.]\d+)?(?:Z|[+-]\d{2}(?::\d{2})?)?/.source + '|' +
    /\d{8}T\d{6}(?:Z|[+-]\d{2}\d{2}?)?/.source +
    ')(?:\\s+|$))+$'
);

/**
 * Regular expression that matches the first line of a scan.
 * 
 * The format of this line can be found in '_head' macro in standard.mac.
 * The following is an example of the line:
 * ```
 * Scan   1   Sat Apr 24 12:16:07 2021   **NO DATA FILE**  eh1  user = eh1user
 * Scan   1   Sat Apr 24 12:20:21 2021   file = align_sample.spec  eh1  user = eh1user
 * ```
 */
const SCAN_LINE_REGEXP = /^(Scan\s+(\d+)\s{3}(\S.*?)\s{3})(?:(file\s*=\s*)(\S.*?)|\*\*NO DATA FILE\*\*)(?=\s{2})\s+(\S.*?)\s{2}user\s*=\s*(\S.*)$/;

interface ParserSuccess {
    readonly foldingRanges: vscode.FoldingRange[];
    readonly documentSymbols: vscode.DocumentSymbol[];
    readonly documentLinks: vscode.DocumentLink[];
    readonly codeLenses: vscode.CodeLens[] | undefined;
}

type ParserResult = ParserSuccess | undefined;

// interface UpdateSession {
//     promise: Promise<ParserResult>;
//     tokenSource: vscode.CancellationTokenSource | undefined;
// }

/** Main controller class */
export class Controller implements vscode.FoldingRangeProvider, vscode.DocumentSymbolProvider, vscode.DocumentLinkProvider<vscode.DocumentLink>, vscode.CodeLensProvider<vscode.CodeLens>, vscode.TextDocumentContentProvider {
    // private readonly updateSessionMap: Map<string, UpdateSession> = new Map();
    private readonly parserResultMap: Map<string, ParserResult> = new Map();

    constructor(context: vscode.ExtensionContext) {

        /** Event listener for when a text document is opened. Also fired when the language ID is manually changed. */
        const textDocumentDidOpenListener = (document: vscode.TextDocument) => {
            if (vscode.languages.match(LOG_SELECTOR, document)) {
                this.parserResultMap.set(document.uri.toString(), parseDocument(document));
            }
        };

        /** Event listener for when a text document is changed. */
        const textDocumentDidChangeListener = (event: vscode.TextDocumentChangeEvent) => {
            const document = event.document;
            if (vscode.languages.match(LOG_SELECTOR, document)) {
                this.parserResultMap.set(document.uri.toString(), parseDocument(document));
            }
        };

        /** Event listener for when a text document is closed. Also fired when the language ID is manually changed. */
        const textDocumentDidCloseListener = (document: vscode.TextDocument) => {
            if (vscode.languages.match(LOG_SELECTOR, document)) {
                this.parserResultMap.delete(document.uri.toString());
            }
        };

        // When the extension is activated by opening a file the extension supports,
        // the `onDidOpenTextDocument` event is not fired.
        // Thus, run the parser session for each open document here.
        for (const document of vscode.workspace.textDocuments) {
            if (vscode.languages.match(LOG_SELECTOR, document)) {
                this.parserResultMap.set(document.uri.toString(), parseDocument(document));
            }
        }

        /** Callback function for the "Fold Level 2" command. */
        const foldLevel2CommandHandler = (...args: any[]) => {
            vscode.commands.executeCommand('editor.foldLevel2', ...args);
        };

        /** Callback function for the "Unfold All" command. */
        const unfoldAllCommandHandler = (...args: any[]) => {
            vscode.commands.executeCommand('editor.unfoldAll', ...args);
        };

        /** 
         * Callback function for the "Preview Scan Data" ("spec-log.editor.previewScanData") command. 
         * The command expects two arguments: a URI of the log file and a range of the scan data in the log file.
         */
        const previewScanDataCommandHandler = async (...args: any[]) => {
            if (
                args.length === 4 &&
                args[0] instanceof vscode.Uri &&
                args[1] instanceof vscode.Range &&
                typeof args[2] === 'string' &&
                typeof args[3] === 'number'
            ) {
                // Get the base name of the log file.
                // In the case slash is not found, `lastSlashIndex` will be -1 and the whole path will be treated as basename, which is acceptable.
                const lastSlashIndex = args[0].path.lastIndexOf('/');
                const basename = args[0].path.substring(lastSlashIndex + 1);

                const uri = vscode.Uri.from({
                    scheme: 'spec-log',
                    path: `/spec-log Scan/${basename}/${args[2]} #${args[3]}`,
                    query: args[0].toString(),
                    fragment: JSON.stringify([args[1].start.line, args[1].start.character, args[1].end.line, args[1].end.character])
                });
                vscode.commands.executeCommand('vscode.openWith', uri, 'spec-data.preview.editor', { viewColumn: vscode.ViewColumn.Beside });
            }
        };

        // Register command handlers, providers, and event-callback functions.
        context.subscriptions.push(
            vscode.commands.registerCommand('spec-log.editor.foldLevel2', foldLevel2CommandHandler),
            vscode.commands.registerCommand('spec-log.editor.unfoldAll', unfoldAllCommandHandler),
            vscode.commands.registerCommand('spec-log.editor.previewScanData', previewScanDataCommandHandler),
            vscode.workspace.onDidOpenTextDocument(textDocumentDidOpenListener),
            vscode.workspace.onDidChangeTextDocument(textDocumentDidChangeListener),
            vscode.workspace.onDidCloseTextDocument(textDocumentDidCloseListener),
            vscode.languages.registerFoldingRangeProvider(LOG_SELECTOR, this),
            vscode.languages.registerDocumentSymbolProvider(LOG_SELECTOR, this),
            vscode.languages.registerDocumentLinkProvider(LOG_SELECTOR, this),
            vscode.languages.registerCodeLensProvider(LOG_SELECTOR, this),
            vscode.workspace.registerTextDocumentContentProvider('spec-log', this),
        );
    }

    // Required implementation of vscode.FoldingRangeProvider.
    public provideFoldingRanges(document: vscode.TextDocument, context: vscode.FoldingContext, token: vscode.CancellationToken): vscode.ProviderResult<vscode.FoldingRange[]> {
        if (token.isCancellationRequested) { return; }

        return this.parserResultMap.get(document.uri.toString())?.foldingRanges;
    }

    // Required implementation of vscode.DocumentSymbolProvider.
    public provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.SymbolInformation[] | vscode.DocumentSymbol[]> {
        if (token.isCancellationRequested) { return; }

        return this.parserResultMap.get(document.uri.toString())?.documentSymbols;
    }

    // Required implementation of vscode.DocumentLinkProvider.
    public provideDocumentLinks(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.DocumentLink[]> {
        if (token.isCancellationRequested) { return; }

        return this.parserResultMap.get(document.uri.toString())?.documentLinks;
    }

    // Required implementation of vscode.DocumentLinkProvider.
    public provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens[]> {
        if (token.isCancellationRequested) { return; }

        return this.parserResultMap.get(document.uri.toString())?.codeLenses;
    }

    // Required implementation of vscode.TextDocumentContentProvider.
    public provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): vscode.ProviderResult<string> {
        if (token.isCancellationRequested) { return undefined; }

        if (uri.scheme === 'spec-log') {
            try {
                const logFileUri = vscode.Uri.parse(uri.query);
                const rangeArray = JSON.parse(uri.fragment) as [number, number, number, number];
                return vscode.workspace.openTextDocument(logFileUri).then(logFileDoc => {
                    return '# mode: csv-column\n' + logFileDoc.getText(new vscode.Range(...rangeArray));
                });
            } catch (error) {
                console.error('Failed to provide text document content for spec-log URI:', error);
            }
        }
        return undefined;
    }

    /**
     * Collect information for code navigation/editing.
     * Cancellation token is integrated.
     */
    /*
    private runUpdateSession(document: vscode.TextDocument): void {
        const uriString = document.uri.toString();

        // If the previous update session is still running, cancel it.
        this.updateSessionMap.get(uriString)?.tokenSource?.cancel();

        // Create a new update session.
        const tokenSource = new vscode.CancellationTokenSource();
        const newSession: UpdateSession = { promise: new Promise(
            resolve => { resolve(parseDocument(document, tokenSource.token)); }
        ), tokenSource };
        newSession.promise.finally(() => {
            // Attach a callback to clean the cancellation token when update is finished.
            tokenSource.dispose();
            newSession.tokenSource = undefined;
        });
        this.updateSessionMap.set(uriString, newSession);
    }
    */
}

/**
 * Parse document.
 */
function parseDocument(document: vscode.TextDocument, token?: vscode.CancellationToken): ParserResult {
    if (token?.isCancellationRequested) { return; }

    const foldingRanges: vscode.FoldingRange[] = [];
    const documentSymbols: vscode.DocumentSymbol[] = [];
    const documentLinks: vscode.DocumentLink[] = [];

    // The CodeLens feature is enabled only when the "fujidana.spec-data" extension exists;
    // Fixed-width text data is supported since version 2.4.0 but currently
    // the extension version is not checked.
    let codeLenses = vscode.extensions.getExtension('fujidana.spec-data') ?
        <vscode.CodeLens[]>[] : undefined;

    const lineCount = document.lineCount;
    let counter = 0;
    let prevWelcome: { lineNumber: number, symbol: vscode.DocumentSymbol } | undefined;
    let prevPrompt: { lineNumber: number, symbol: vscode.DocumentSymbol } | undefined;
    let umvStart = -1;

    for (let lineNumber = 0; lineNumber < lineCount; lineNumber++) {
        if (token?.isCancellationRequested) { return; }

        const currentLine = document.lineAt(lineNumber);
        let matches: RegExpMatchArray | null;

        // Make continuous lines consisting of number and date-time foldable.
        if (DATETIME_LINE_REGEXP.test(currentLine.text)) {
            if (umvStart === -1) {
                umvStart = lineNumber;
            }
            continue;
        } else if (umvStart !== -1) {
            if (umvStart < lineNumber - 2) {
                foldingRanges.push(new vscode.FoldingRange(umvStart, lineNumber - 2));
            }
            umvStart = -1;
        }

        if ((matches = currentLine.text.match(PROMPT_LINE_REGEXP)) !== null) {
            // In case the line is a prompt like `123.SPEC>`...
            if (prevWelcome) {
                // Make a block between "welcome" line and a line before the first prompt foldable.
                if (prevWelcome.lineNumber >= 0 && prevWelcome.symbol.children.length === 0) {
                    foldingRanges.push(new vscode.FoldingRange(prevWelcome.lineNumber + 1, lineNumber - 1));
                }
            } else {
                // Create a dummy document symbol for welcome if it does not exist.
                // This happens when the log file is deleted or moved during spec is running.
                const range = new vscode.Range(0, 0, 0, 0);
                const symbol = new vscode.DocumentSymbol('session #0', '', vscode.SymbolKind.Enum, range, range);
                prevWelcome = { lineNumber: -1, symbol: symbol };
                documentSymbols.push(symbol);
            }

            // Make the previous prompt block foldable.
            if (prevPrompt && prevPrompt.lineNumber < lineNumber - 1) {
                foldingRanges.push(new vscode.FoldingRange(prevPrompt.lineNumber, lineNumber - 1));
                prevPrompt.symbol.range = new vscode.Range(prevPrompt.symbol.range.start, document.lineAt(lineNumber - 1).range.end);
            }

            // Create a new prompt symbol. The range is modified later.
            const symbol = new vscode.DocumentSymbol(matches[1], matches[2], vscode.SymbolKind.EnumMember, currentLine.range, currentLine.range);
            prevWelcome.symbol.children.push(symbol);
            prevPrompt = { lineNumber: lineNumber, symbol: symbol };
        } else if ((matches = currentLine.text.match(WELCOME_LINE_REGEXP)) !== null && lineNumber > 0 && document.lineAt(lineNumber - 1).isEmptyOrWhitespace) {
            // In case the line is a welcome message like `Welcome to "spec" Release`,
            // which means spec has just started.

            // Update the range of previous prompt symbol.
            if (prevPrompt && prevPrompt.lineNumber < lineNumber - 2) {
                foldingRanges.push(new vscode.FoldingRange(prevPrompt.lineNumber, lineNumber - 2));
                prevPrompt.symbol.range = new vscode.Range(prevPrompt.symbol.range.start, document.lineAt(lineNumber - 2).range.end);
            }

            // Update the range of previous welcome symbol.
            if (prevWelcome && prevWelcome.lineNumber < lineNumber - 2) {
                foldingRanges.push(new vscode.FoldingRange(prevWelcome.lineNumber, lineNumber - 2));
                prevWelcome.symbol.range = new vscode.Range(prevWelcome.symbol.range.start, document.lineAt(lineNumber - 2).range.end);
            }

            // Create a new welcome symbol. The range is modified later.
            const range = new vscode.Range(document.lineAt(lineNumber - 1).range.start, currentLine.range.end);
            const symbol = new vscode.DocumentSymbol(`session #${++counter}`, '', vscode.SymbolKind.Enum, range, range);
            documentSymbols.push(symbol);
            prevWelcome = { lineNumber: lineNumber - 1, symbol: symbol };
            prevPrompt = undefined;
        } else if ((matches = currentLine.text.match(SCAN_LINE_REGEXP)) !== null) {
            // In case the line is the header of a scan data block starting with `Scan 1   ...`

            // Make a link if a file path is found in the scan header line.
            if (matches[5] && matches[5].length > 0) {
                const range = new vscode.Range(lineNumber, matches[1].length + matches[4].length, lineNumber, matches[1].length + matches[4].length + matches[5].length);
                let workspaceFolder: vscode.WorkspaceFolder | undefined;
                if (matches[5].startsWith('/')) {
                    documentLinks.push(new vscode.DocumentLink(range, vscode.Uri.file(matches[5])));
                } else if ((workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri)) !== undefined) {
                    documentLinks.push(new vscode.DocumentLink(range, vscode.Uri.joinPath(workspaceFolder.uri, matches[5])));
                }
            }

            // Consume the continuous lines if they consists of numeric values only.
            if (prevPrompt && lineNumber + 4 < lineCount && document.lineAt(lineNumber + 2).isEmptyOrWhitespace && /\s*#/.test(document.lineAt(lineNumber + 3).text)) {
                const scanCommandStr = document.lineAt(lineNumber + 1).text;
                lineNumber += 4;
                const scanStart = lineNumber;
                while (lineNumber < lineCount && NUMBER_LINE_REGEXP.test(document.lineAt(lineNumber).text)) {
                    lineNumber++;
                }
                lineNumber--;
                if (scanStart < lineNumber - 2) {
                    foldingRanges.push(new vscode.FoldingRange(scanStart, lineNumber - 1));
                }

                const range = new vscode.Range(currentLine.range.start, document.lineAt(lineNumber).range.end);
                prevPrompt.symbol.children.push(new vscode.DocumentSymbol(`Scan ${matches[2]}`, scanCommandStr, vscode.SymbolKind.Number, range, currentLine.range));

                if (codeLenses) {
                    const command: vscode.Command = {
                        command: 'spec-log.editor.previewScanData',
                        title: 'Preview Scan Data',
                        arguments: [document.uri, range, matches[5] ?? '**NO DATA FILE**', parseInt(matches[2], 10)],
                    };
                    const codeLens = new vscode.CodeLens(currentLine.range, command);
                    codeLenses.push(codeLens);
                }
            }
        }
    }

    if (umvStart !== -1 && umvStart < lineCount - 2) {
        foldingRanges.push(new vscode.FoldingRange(umvStart, lineCount - 2));
    }

    const eofPosition = document.lineAt(lineCount - 1).range.end;

    // Update the range of previous prompt symbol.
    if (prevPrompt && prevPrompt.lineNumber < lineCount - 1) {
        foldingRanges.push(new vscode.FoldingRange(prevPrompt.lineNumber, lineCount - 1));
        prevPrompt.symbol.range = new vscode.Range(prevPrompt.symbol.range.start, eofPosition);
    }

    // Update the range of previous welcome symbol.
    if (prevWelcome && prevWelcome.lineNumber < lineCount - 1) {
        if (prevWelcome.lineNumber >= 0) {
            foldingRanges.push(new vscode.FoldingRange(prevWelcome.lineNumber, lineCount - 1));
        }
        prevWelcome.symbol.range = new vscode.Range(prevWelcome.symbol.range.start, eofPosition);
    }

    return { foldingRanges, documentSymbols, documentLinks, codeLenses };
}
