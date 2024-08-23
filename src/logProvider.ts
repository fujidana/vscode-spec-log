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
const NUMONLY_LINE_REGEXP = /^\s*([+-]?[0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?(?:\s+|$))+$/;

/*
 * Regular expression that matches the first line of a scan.
 * 
 * The format of this line can be found in '_head' macro in standard.mac.
*/
const SCAN_LINE_REGEXP = /^Scan\s+(\d+)\s{3}(\S.*?)(?=\s{3})\s+(?:file\s*=\s*(\S.*?)|\*\*NO DATA FILE\*\*)(?=\s{2})\s+(\S.*?)(?=\s{2})\s+user\s*=\s*(\S.*)$/;


/**
 * Provider class
 */
export class LogProvider implements vscode.FoldingRangeProvider, vscode.DocumentSymbolProvider {

    constructor(context: vscode.ExtensionContext) {
        // register providers
        context.subscriptions.push(
            vscode.languages.registerFoldingRangeProvider(LOG_SELECTOR, this),
            vscode.languages.registerDocumentSymbolProvider(LOG_SELECTOR, this),
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
        let numOnlyLineIndex = -1;

        for (let index = 0; index < lineCount; index++) {
            if (token.isCancellationRequested) { return; }

            const text = document.lineAt(index).text;

            if (NUMONLY_LINE_REGEXP.test(text)) {
                if (numOnlyLineIndex === -1) {
                    numOnlyLineIndex = index;
                }
                continue;
            } else if (numOnlyLineIndex !== -1) {
                if (numOnlyLineIndex < index - 2) {
                    ranges.push(new vscode.FoldingRange(numOnlyLineIndex, index - 2));
                }
                numOnlyLineIndex = -1;
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

        if (numOnlyLineIndex !== -1 && numOnlyLineIndex < lineCount - 2) {
            ranges.push(new vscode.FoldingRange(numOnlyLineIndex, lineCount - 2));
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

        const lineCount = document.lineCount;
        const welcomeSymbols: vscode.DocumentSymbol[] = [];
        let previousLine: vscode.TextLine | undefined;
        let counter = 0;
        let lastWelcomeSymbol: vscode.DocumentSymbol | undefined;
        let lastPromptSymbol: vscode.DocumentSymbol | undefined;

        for (let index = 0; index < lineCount; index++) {
            if (token.isCancellationRequested) { return; }

            const currentLine = document.lineAt(index);
            let matches: RegExpMatchArray | null;
            if ((matches = currentLine.text.match(PROMPT_LINE_REGEXP)) !== null) {
                // update the range of previous prompt symbol
                if (lastPromptSymbol && previousLine) {
                    lastPromptSymbol.range = new vscode.Range(lastPromptSymbol.range.start, previousLine.range.end);
                }
                // create a new prompt symbol
                lastPromptSymbol = new vscode.DocumentSymbol( matches[1], matches[2], vscode.SymbolKind.EnumMember, currentLine.range, currentLine.range);
                if (lastWelcomeSymbol === undefined) {
                    // create a new welcome symbol if not exist. This happens when the log file is deleted or moved during spec is running.
                    const range = new vscode.Range(0, 0, 0, 0);
                    lastWelcomeSymbol = new vscode.DocumentSymbol('session #0', '', vscode.SymbolKind.Enum, range, range);
                    welcomeSymbols.push(lastWelcomeSymbol);
                }
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
                if (lastPromptSymbol && index + 4 < lineCount && document.lineAt(index + 2).isEmptyOrWhitespace && /\s*#/.test(document.lineAt(index + 3).text)) {
                    index += 4;
                    while (index < lineCount && NUMONLY_LINE_REGEXP.test(document.lineAt(index).text)) {
                        index++;
                    }
                    index--;
                    // const commandStr = document.lineAt(index + 1);
                    const range = new vscode.Range(currentLine.range.start, document.lineAt(index).range.end);
                    lastPromptSymbol.children.push(new vscode.DocumentSymbol(`Scan ${matches[1]}`, matches[3], vscode.SymbolKind.Number, range, currentLine.range));
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
                lastWelcomeSymbol.range = new vscode.Range(lastWelcomeSymbol.range.start,previousLine.range.end);
            }
        }
        return welcomeSymbols;
    }
}
