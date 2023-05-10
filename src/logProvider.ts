import * as vscode from 'vscode';


const LOG_SELECTOR = { language: 'spec-log' };

const WELCOME_REGEXP = /^(\s*)(Welcome to "spec" Release)/;
const PROMPT_REGEXP = /^([0-9]+\.[A-Z][A-Z0-9]*>)\s+(.*)\s*$/;

/**
 * Regular expression that matches a line consisting of numbers and separating white spaces.
 * 
 * The following representations will be matched:
 * - decimal: 123, -012, +0099
 * - digit: 1.0, -123.0, +123.02 (N/A: .111, 12.)
 * - 10-power: 1e3, -2.0E-03, +0.1e+0 (N/A: 0.1e)
 */
const NUMONLY_REGEXP = /^\s*([+-]?[0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?(?:\s+|$))+$/;


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

            if (NUMONLY_REGEXP.test(text)) {
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

            if (PROMPT_REGEXP.test(text)) {
                if (promptLineIndex !== -1 && promptLineIndex < index - 1) {
                    ranges.push(new vscode.FoldingRange(promptLineIndex, index - 1));
                }
                promptLineIndex = index;
            } else if (WELCOME_REGEXP.test(text) && index > 0 && document.lineAt(index - 1).isEmptyOrWhitespace) {
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
        const promptSymbols: vscode.DocumentSymbol[] = [];
        let previousLine: vscode.TextLine | undefined;
        let welcomeRange: vscode.Range | undefined;
        let promptInfo: { range: vscode.Range, name: string, detail: string } | undefined;
        let counter = 0;

        function didFindWelcomeRangeEnd(endPosition: vscode.Position) {
            if (promptInfo) {
                const range = new vscode.Range(promptInfo.range.start, endPosition);
                promptSymbols.push(new vscode.DocumentSymbol(promptInfo.name, promptInfo.detail, vscode.SymbolKind.EnumMember, range, promptInfo.range));
            }
            if (welcomeRange) {
                const range = new vscode.Range(welcomeRange.start, endPosition);
                const welcomeSymbol = new vscode.DocumentSymbol(`session #${++counter}`, '', vscode.SymbolKind.Enum, range, welcomeRange);
                welcomeSymbol.children.push(...promptSymbols);
                welcomeSymbols.push(welcomeSymbol);
                promptSymbols.length = 0;
            } else if (promptSymbols.length > 0) {
                const documentRangeStart = new vscode.Position(0, 0);
                const range = new vscode.Range(documentRangeStart, endPosition);
                const selectionRange = new vscode.Range(documentRangeStart, documentRangeStart);
                const welcomeSymbol = new vscode.DocumentSymbol('session #0', '', vscode.SymbolKind.Enum, range, selectionRange);
                welcomeSymbol.children.push(...promptSymbols);
                welcomeSymbols.push(welcomeSymbol);
                promptSymbols.length = 0;
            }
        }

        for (let index = 0; index < lineCount; index++) {
            if (token.isCancellationRequested) { return; }

            const currentLine = document.lineAt(index);
            const matches = currentLine.text.match(PROMPT_REGEXP);
            if (matches) {
                if (promptInfo && previousLine) {
                    const range = new vscode.Range(promptInfo.range.start, previousLine.range.end);
                    promptSymbols.push(new vscode.DocumentSymbol(promptInfo.name, promptInfo.detail, vscode.SymbolKind.EnumMember, range, promptInfo.range));
                }
                promptInfo = { range: currentLine.range, name: matches[1], detail: matches[2] };
            } else if (currentLine.text.match(WELCOME_REGEXP) && index > 0 && previousLine && previousLine.isEmptyOrWhitespace) {
                if (index > 1) {
                    didFindWelcomeRangeEnd(document.lineAt(index - 2).range.end);
                }
                promptInfo = undefined;
                welcomeRange = new vscode.Range(previousLine.range.start, currentLine.range.end);
            }
            previousLine = currentLine;
        }

        if (previousLine) {
            didFindWelcomeRangeEnd(previousLine.range.end);
        }

        return welcomeSymbols;
    }
}
