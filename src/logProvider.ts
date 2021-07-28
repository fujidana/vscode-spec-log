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
        let welcomeRange: vscode.Range | undefined;
        let promptRange: vscode.Range | undefined;
        let matches: RegExpMatchArray | null;
        let promptName: string = '';
        let promptDetail: string = '';
        let counter = 0;
        const welcomeSymbolKind = vscode.SymbolKind.Enum;
        const promptSymbolKind = vscode.SymbolKind.EnumMember;

        for (let index = 0; index < lineCount; index++) {
            const text = document.lineAt(index).text;
            if (matches = text.match(this.promptRegExp)) {
                if (promptRange) {
                    const range = new vscode.Range(promptRange.start, new vscode.Position(index, 0));
                    promptSymbols.push(new vscode.DocumentSymbol(promptName, promptDetail, promptSymbolKind, range, promptRange));
                }
                promptRange = new vscode.Range(index, 0, index, text.length);
                promptName = matches[1];
                promptDetail =  matches[2];
            } else if (text.match(this.welcomeRegExp) && index > 0 && document.lineAt(index - 1).isEmptyOrWhitespace) {
                if (promptRange) {
                    const range = new vscode.Range(promptRange.start, new vscode.Position(index - 1, 0));
                    promptSymbols.push(new vscode.DocumentSymbol(promptName, promptDetail, promptSymbolKind, range, promptRange));
                    // symbols.push(new vscode.FoldingRange(promptLineIndex, index - 2));
                }
                if (welcomeRange) {
                    const range = new vscode.Range(welcomeRange.start, new vscode.Position(index - 1, 0));
                    const welcomeSymbol = new vscode.DocumentSymbol(`session #${++counter}`, '', welcomeSymbolKind, range, welcomeRange);
                    welcomeSymbol.children.push(...promptSymbols);
                    welcomeSymbols.push(welcomeSymbol);
                    promptSymbols.length = 0;
                } else if (promptSymbols.length > 0) {
                    const range = new vscode.Range(0, 0, index - 1, 0);
                    const selectionRange = new vscode.Range(0, 0, 0, 0);
                    const  welcomeSymbol = new vscode.DocumentSymbol('session #0', '', welcomeSymbolKind, range, selectionRange);
                    welcomeSymbol.children.push(...promptSymbols);
                    welcomeSymbols.push(welcomeSymbol);
                    promptSymbols.length = 0;
                }
                promptRange = undefined;
                welcomeRange = new vscode.Range(index - 1, 0, index, text.length);
            }
        }

        if (promptRange) {
            const range = new vscode.Range(promptRange.start, new vscode.Position(lineCount, 0));
            promptSymbols.push(new vscode.DocumentSymbol(promptName, promptDetail, promptSymbolKind, range, promptRange));
        }
        if (welcomeRange) {
            const range = new vscode.Range(welcomeRange.start, new vscode.Position(lineCount, 0));
            const welcomeSymbol = new vscode.DocumentSymbol(`session #${++counter}`, '', welcomeSymbolKind, range, welcomeRange);
            welcomeSymbol.children.push(...promptSymbols);
            welcomeSymbols.push(welcomeSymbol);
            promptSymbols.length = 0;
        } else if (promptSymbols.length > 0) {
            const range = new vscode.Range(0, 0, lineCount, 0);
            const selectionRange = new vscode.Range(0, 0, 0, 0);
            const  welcomeSymbol = new vscode.DocumentSymbol('session #0', '', welcomeSymbolKind, range, selectionRange);
            welcomeSymbol.children.push(...promptSymbols);
            welcomeSymbols.push(welcomeSymbol);
            promptSymbols.length = 0;
        }

        return welcomeSymbols;
    }
}
