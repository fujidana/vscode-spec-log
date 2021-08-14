import * as vscode from 'vscode';

const LOG_SELECTOR = { language: 'spec-log' };
// const LOG_SELECTOR = { scheme: 'file', language: 'spec-log' };

/**
 * Provider class
 */
export class LogProvider implements vscode.FoldingRangeProvider, vscode.DocumentSymbolProvider {
    readonly welcomeRegExp = /^(\s*)(Welcome to "spec" Release)/;
    readonly promptRegExp = /^([0-9]+\.[A-Z][A-Z0-9]*>)\s+(.*)\s*$/;

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

        for (let index = 0; index < lineCount; index++) {
            const text = document.lineAt(index).text;
            if (text.match(this.promptRegExp)) {
                if (promptLineIndex >= 0 && promptLineIndex < index - 1) {
                    ranges.push(new vscode.FoldingRange(promptLineIndex, index - 1));
                }
                promptLineIndex = index;
            } else if (text.match(this.welcomeRegExp) && index > 0 && document.lineAt(index - 1).isEmptyOrWhitespace) {
                if (promptLineIndex >= 0 && promptLineIndex < index - 2) {
                    ranges.push(new vscode.FoldingRange(promptLineIndex, index - 2));
                }
                if (welcomeLineIndex >= 0 && welcomeLineIndex < index - 2) {
                    ranges.push(new vscode.FoldingRange(welcomeLineIndex, index - 2));
                }
                promptLineIndex = -1;
                welcomeLineIndex = index - 1;
            }
        }

        if (welcomeLineIndex >= 0 && welcomeLineIndex < lineCount - 1) {
            ranges.push(new vscode.FoldingRange(welcomeLineIndex, lineCount - 1));
        }
        if (promptLineIndex >= 0 && promptLineIndex < lineCount - 1) {
            ranges.push(new vscode.FoldingRange(promptLineIndex, lineCount - 1));
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
            const currentLine = document.lineAt(index);
            let matches: RegExpMatchArray | null;

            if (matches = currentLine.text.match(this.promptRegExp)) {
                if (promptInfo && previousLine) {
                    const range = new vscode.Range(promptInfo.range.start, previousLine.range.end);
                    promptSymbols.push(new vscode.DocumentSymbol(promptInfo.name, promptInfo.detail, vscode.SymbolKind.EnumMember, range, promptInfo.range));
                }
                promptInfo = { range: currentLine.range, name: matches[1], detail: matches[2] };
            } else if (currentLine.text.match(this.welcomeRegExp) && index > 0 && previousLine && previousLine.isEmptyOrWhitespace) {
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
