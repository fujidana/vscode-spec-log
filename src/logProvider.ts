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
    * - The fomart `date()` outputs, e.g., `Wed Jan 31 01:23:45 2024`
    *   - The format may be different on the Linux system that spec depends. Only the format like the example above is supported.
    * - ISO 8601 basic and extended formats, e.g., `2024-01-31T01:23:45+09:00`, `20240131T012345+0900`
    *   - The time zone can be omitted (though it is not compliant)
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


/*
 * Regular expression that matches the first line of a scan.
 * 
 * The format of this line can be found in '_head' macro in standard.mac.
*/
const SCAN_LINE_REGEXP = /^(Scan\s+(\d+)\s{3}(\S.*?)\s{3})(?:(file\s*=\s*)(\S.*?)|\*\*NO DATA FILE\*\*)(?=\s{2})\s+(\S.*?)\s{2}user\s*=\s*(\S.*)$/;

type ParsedData = { documentSymbols: vscode.DocumentSymbol[], documentLinks: vscode.DocumentLink[] };

/**
 * Provider class
 */
export class LogProvider implements vscode.FoldingRangeProvider, vscode.DocumentSymbolProvider, vscode.DocumentLinkProvider<vscode.DocumentLink> {
    readonly parsedDataMap = new Map<string, Promise<ParsedData>>();

    constructor(context: vscode.ExtensionContext) {

        // a hander invoked when the document is opened
        // this is also invoked after the user manually changed the language id
        const textDocumentDidOpenListener = (document: vscode.TextDocument) => {
            if (vscode.languages.match(LOG_SELECTOR, document)) {
                this.parsedDataMap.set(document.uri.toString(), this.parseDocument(document));
            }
        };

        // a hander invoked when the document is changed
        const textDocumentDidChangeListener = (event: vscode.TextDocumentChangeEvent) => {
            const document = event.document;
            if (vscode.languages.match(LOG_SELECTOR, document)) {
                this.parsedDataMap.set(document.uri.toString(), this.parseDocument(document));
            }
        };

        // a hander invoked when the document is closed
        // this is also invoked after the user manually changed the language id
        const textDocumentDidCloseListener = (document: vscode.TextDocument) => {
            if (vscode.languages.match(LOG_SELECTOR, document)) {
                this.parsedDataMap.delete(document.uri.toString());
            }
        };

        // When the extension is activated by opening a log file, 
        for (const document of vscode.workspace.textDocuments) {
            if (vscode.languages.match(LOG_SELECTOR, document)) {
                this.parsedDataMap.set(document.uri.toString(), this.parseDocument(document));
            }
        }

        // register providers
        context.subscriptions.push(
            vscode.workspace.onDidOpenTextDocument(textDocumentDidOpenListener),
            vscode.workspace.onDidChangeTextDocument(textDocumentDidChangeListener),
            vscode.workspace.onDidCloseTextDocument(textDocumentDidCloseListener),
            vscode.languages.registerFoldingRangeProvider(LOG_SELECTOR, this),
            vscode.languages.registerDocumentSymbolProvider(LOG_SELECTOR, this),
            vscode.languages.registerDocumentLinkProvider(LOG_SELECTOR, this),
        );
    }

    /**
     * Required implementation of vscode.FoldingRangeProvider
     */
    public provideFoldingRanges(document: vscode.TextDocument, context: vscode.FoldingContext, token: vscode.CancellationToken): vscode.ProviderResult<vscode.FoldingRange[]> {
        if (token.isCancellationRequested) { return; }

        const lineCount = document.lineCount;
        const ranges: vscode.FoldingRange[] = [];
        let welcomeLineIndex = -1;
        let promptLineIndex = -1;
        let updatingLineIndex = -1;
        // let updatingType: 'number' | 'datetime' | undefined;

        for (let index = 0; index < lineCount; index++) {
            if (token.isCancellationRequested) { return; }

            const text = document.lineAt(index).text;

            // const isNumLine = NUMBER_LINE_REGEXP.test(text);
            const isDateTimeLine = DATETIME_LINE_REGEXP.test(text);

            if (isDateTimeLine) {
                // if (isNumLine || isDateTimeLine) {
                if (updatingLineIndex === -1) {
                    updatingLineIndex = index;
                    // updatingType = isNumLine ? 'number': 'datetime';
                    // } else if (isNumLine && updatingType === 'datetime' || isDateTimeLine && updatingType === 'number') {
                    //     if (updatingLineIndex < index - 2) {
                    //         ranges.push(new vscode.FoldingRange(updatingLineIndex, index - 2));
                    //     }
                    //     updatingLineIndex = index;
                    //     updatingType = isNumLine ? 'number': 'datetime';
                }
                continue;
            } else if (updatingLineIndex !== -1) {
                if (updatingLineIndex < index - 2) {
                    ranges.push(new vscode.FoldingRange(updatingLineIndex, index - 2));
                }
                updatingLineIndex = -1;
                // updatingType = undefined;
            }

            if (PROMPT_LINE_REGEXP.test(text)) {
                if (promptLineIndex !== -1 && promptLineIndex < index - 1) {
                    ranges.push(new vscode.FoldingRange(promptLineIndex, index - 1));
                }
                promptLineIndex = index;
            } else if (WELCOME_LINE_REGEXP.test(text) && index > 0 && document.lineAt(index - 1).isEmptyOrWhitespace) {
                if (promptLineIndex !== -1 && promptLineIndex < index - 2) {
                    ranges.push(new vscode.FoldingRange(promptLineIndex, index - 2));
                }
                if (welcomeLineIndex !== -1 && welcomeLineIndex < index - 2) {
                    ranges.push(new vscode.FoldingRange(welcomeLineIndex, index - 2));
                }
                promptLineIndex = index;
                welcomeLineIndex = index - 1;
            }
        }

        if (updatingLineIndex !== -1 && updatingLineIndex < lineCount - 2) {
            ranges.push(new vscode.FoldingRange(updatingLineIndex, lineCount - 2));
        }
        if (promptLineIndex !== -1 && promptLineIndex < lineCount - 1) {
            ranges.push(new vscode.FoldingRange(promptLineIndex, lineCount - 1));
        }
        if (welcomeLineIndex !== -1 && welcomeLineIndex < lineCount - 1) {
            ranges.push(new vscode.FoldingRange(welcomeLineIndex, lineCount - 1));
        }

        return ranges;
    }

    /**
     * Required implementation of vscode.DocumentSymbolProvider
     */
    public provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.SymbolInformation[] | vscode.DocumentSymbol[]> {
        if (token.isCancellationRequested) { return; }

        const promisedData = this.parsedDataMap.get(document.uri.toString());
        if (promisedData) {
            return promisedData.then(parsedData => parsedData.documentSymbols);
        }
    }

    /**
     * Required implementation of vscode.DocumentLinkProvider
     */
    public provideDocumentLinks(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.DocumentLink[]> {
        if (token.isCancellationRequested) { return; }

        const promisedData = this.parsedDataMap.get(document.uri.toString());
        if (promisedData) {
            return promisedData.then(parsedData => parsedData.documentLinks);
        }
    }

    /**
     * Parse document.
     */
    async parseDocument(document: vscode.TextDocument): Promise<ParsedData> {
        // if (token.isCancellationRequested) { return; }
        const lineCount = document.lineCount;
        const welcomeSymbols: vscode.DocumentSymbol[] = [];
        const documentLinks: vscode.DocumentLink[] = [];
        let previousLine: vscode.TextLine | undefined;
        let counter = 0;
        let lastWelcomeSymbol: vscode.DocumentSymbol | undefined;
        let lastPromptSymbol: vscode.DocumentSymbol | undefined;

        for (let index = 0; index < lineCount; index++) {
            // if (token.isCancellationRequested) { return; }

            const currentLine = document.lineAt(index);
            let matches: RegExpMatchArray | null;
            if ((matches = currentLine.text.match(PROMPT_LINE_REGEXP)) !== null) {
                // update the range of previous prompt symbol
                if (lastPromptSymbol && previousLine) {
                    lastPromptSymbol.range = new vscode.Range(lastPromptSymbol.range.start, previousLine.range.end);
                }
                // create a new welcome symbol if not exist. This happens when the log file is deleted or moved during spec is running.
                if (lastWelcomeSymbol === undefined) {
                    const range = new vscode.Range(0, 0, 0, 0);
                    lastWelcomeSymbol = new vscode.DocumentSymbol('session #0', '', vscode.SymbolKind.Enum, range, range);
                    welcomeSymbols.push(lastWelcomeSymbol);
                }
                // create a new prompt symbol
                lastPromptSymbol = new vscode.DocumentSymbol(matches[1], matches[2], vscode.SymbolKind.EnumMember, currentLine.range, currentLine.range);
                lastWelcomeSymbol.children.push(lastPromptSymbol);
            } else if ((matches = currentLine.text.match(WELCOME_LINE_REGEXP)) !== null && index > 0 && previousLine && previousLine.isEmptyOrWhitespace) {
                // update the range of previous prompt symbol
                if (lastPromptSymbol && previousLine && index > 1) {
                    lastPromptSymbol.range = new vscode.Range(lastPromptSymbol.range.start, document.lineAt(index - 2).range.end);
                }
                // update the range of previous welcome symbol
                if (lastWelcomeSymbol && previousLine && index > 1) {
                    lastWelcomeSymbol.range = new vscode.Range(lastWelcomeSymbol.range.start, document.lineAt(index - 2).range.end);
                }
                // create a new welcome symbol
                const range = new vscode.Range(previousLine.range.start, currentLine.range.end);
                lastWelcomeSymbol = new vscode.DocumentSymbol(`session #${++counter}`, '', vscode.SymbolKind.Enum, range, range);
                welcomeSymbols.push(lastWelcomeSymbol);
                lastPromptSymbol = undefined;
            } else if ((matches = currentLine.text.match(SCAN_LINE_REGEXP)) !== null) {
                // make a link if a file path is found in a scan header line.
                if (matches[5] && matches[5].length > 0) {
                    const range = new vscode.Range(index, matches[1].length + matches[4].length, index, matches[1].length + matches[4].length + matches[5].length);
                    let workspaceFolder: vscode.WorkspaceFolder | undefined;
                    if (matches[5].startsWith('/')) {
                        documentLinks.push(new vscode.DocumentLink(range, vscode.Uri.file(matches[5])));
                    } else if ((workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri)) !== undefined) {
                        documentLinks.push(new vscode.DocumentLink(range, vscode.Uri.joinPath(workspaceFolder.uri, matches[5])));
                    }
                }

                // comsume the continuous lines if they consists of numbers scan data
                if (lastPromptSymbol && index + 4 < lineCount && document.lineAt(index + 2).isEmptyOrWhitespace && /\s*#/.test(document.lineAt(index + 3).text)) {
                    const scanCommandStr = document.lineAt(index + 1).text;
                    index += 4;
                    while (index < lineCount && NUMBER_LINE_REGEXP.test(document.lineAt(index).text)) {
                        index++;
                    }
                    index--;
                    const range = new vscode.Range(currentLine.range.start, document.lineAt(index).range.end);
                    lastPromptSymbol.children.push(new vscode.DocumentSymbol(`Scan ${matches[2]}`, scanCommandStr, vscode.SymbolKind.Number, range, currentLine.range));
                }
            }
            previousLine = currentLine;
        }

        if (previousLine) {
            // update the range of previous prompt symbol
            if (lastPromptSymbol && previousLine) {
                lastPromptSymbol.range = new vscode.Range(lastPromptSymbol.range.start, previousLine.range.end);
            }
            // update the range of previous welcome symbol
            if (lastWelcomeSymbol && previousLine) {
                lastWelcomeSymbol.range = new vscode.Range(lastWelcomeSymbol.range.start, previousLine.range.end);
            }
        }
        return { documentSymbols: welcomeSymbols, documentLinks: documentLinks };
    }
}
