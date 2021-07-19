import * as vscode from 'vscode';

const LOG_SELECTOR = { language: 'spec-log' };
// const LOG_SELECTOR = { scheme: 'file', language: 'spec-log' };

/**
 * Provider class
 */
export class LogProvider implements vscode.FoldingRangeProvider, vscode.DocumentSymbolProvider {
    readonly regexp = /^([0-9]+\.[A-Z][A-Z0-9]*>)\s+(.*)\s*$/;

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
        let lineAtPrompt = 0;

        for (let index = 0; index < lineCount; index++) {
            if (document.lineAt(index).text.match(this.regexp)) {
                if (lineAtPrompt < index - 1) {
                    ranges.push(new vscode.FoldingRange(lineAtPrompt, index - 1));
                }
                lineAtPrompt = index;
            }
        }
        if (lineAtPrompt < lineCount - 1) {
            ranges.push(new vscode.FoldingRange(lineAtPrompt, lineCount - 1));
        }
        return ranges;
    }

    /**
     * Required implementation of vscode.DocumentSymbolProvider
     */
    public provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.SymbolInformation[] | vscode.DocumentSymbol[]> {
        if (token.isCancellationRequested) { return; }

        const lineCount = document.lineCount;
        const results: vscode.DocumentSymbol[] = [];
        let prevMatch: { range: vscode.Range, matches: RegExpMatchArray } | undefined;

        for (let index = 0; index < lineCount; index++) {
            const matches = document.lineAt(index).text.match(this.regexp);
            if (matches) {
                if (prevMatch) {
                    const fullRange = new vscode.Range(prevMatch.range.start, new vscode.Position(index - 1, 0));
                    results.push(new vscode.DocumentSymbol(prevMatch.matches[1], prevMatch.matches[2], vscode.SymbolKind.Key, fullRange, prevMatch.range));
                }
                prevMatch = { range: new vscode.Range(index, 0, index, matches[0].length), matches: matches };
            }
        }

        if (prevMatch && prevMatch.range.start.line < lineCount - 1) {
            const fullRange = new vscode.Range(prevMatch.range.start, new vscode.Position(lineCount - 1, 0));
            results.push(new vscode.DocumentSymbol(prevMatch.matches[1], prevMatch.matches[2], vscode.SymbolKind.Key, fullRange, prevMatch.range));
        }
        return results;
    }
}
