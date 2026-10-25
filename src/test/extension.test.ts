import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../../extension';

/*
 * TODO: Add tests for the following features:
 *
 * - Whether the database is updated after the document is changed
 * - Whether the database is cleared after the document is closed
 */

suite('Extension Test Suite', function () {
	vscode.window.showInformationMessage('Start all tests.');

	let document: vscode.TextDocument;
	let editor: vscode.TextEditor;
	let fixtureWorkspaceAdded = false;

	suiteSetup('Open a sample document', async function () {
		const extension = vscode.extensions.getExtension('fujidana.spec-log');
		assert.ok(extension, 'The spec-log extension is not available.');

		const fixtureDirectoryUri = vscode.Uri.joinPath(extension.extensionUri, 'src', 'test', 'fixtures');
		const fixtureUri = vscode.Uri.joinPath(fixtureDirectoryUri, 'fixture_1.tlog');
		if (!vscode.workspace.getWorkspaceFolder(fixtureUri)) {
			console.log('Adding the fixture folder to the workspace.');
			fixtureWorkspaceAdded = vscode.workspace.updateWorkspaceFolders(0, 0, {
				uri: fixtureDirectoryUri,
				name: 'spec-log fixtures',
			});
		}

		document = await vscode.workspace.openTextDocument(fixtureUri);
		editor = await vscode.window.showTextDocument(document);
	});

	suiteTeardown('Close the sample document', async function () {
		if (vscode.window.activeTextEditor === editor) {
			await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
		}

		if (fixtureWorkspaceAdded) {
			vscode.workspace.updateWorkspaceFolders(0, 1);
		}
	});

	test('Basic test', function () {
		assert.strictEqual(document.languageId, 'spec-log');
	});

	test('Folding range test', async function () {
		const foldingRanges = await vscode.commands.executeCommand<vscode.FoldingRange[]>('vscode.executeFoldingRangeProvider', document.uri);
		assert.ok(foldingRanges, 'No folding ranges returned.');
		assert.ok(foldingRanges.length > 0, 'No folding ranges found in the document.');
	});

	test('Document symbols test', async function () {
		const documentSymbols = await vscode.commands.executeCommand<vscode.SymbolInformation[] | vscode.DocumentSymbol[]>('vscode.executeDocumentSymbolProvider', document.uri);
		assert.ok(documentSymbols, 'No document symbols returned.');
		assert.ok(documentSymbols.length > 0, 'No document symbols found in the document.');
	});

	/*
	 * A workspace folder needs to be set for a document link in the form of 
	 * a relative path to be resolved correctly.
	 */
	test('Document links test', async function () {
		if (vscode.workspace.getWorkspaceFolder(document.uri) === undefined) {
			// assert.fail('The fixture workspace folder is not available.');
			this.skip();
		}

		const documentLinks = await vscode.commands.executeCommand<vscode.DocumentLink[]>('vscode.executeLinkProvider', document.uri);
		assert.ok(documentLinks, 'No document links returned.');
		assert.ok(documentLinks.length > 0, 'No document links found in the document.');
	});

	test('Code lens test', async function () {
		if (!vscode.extensions.getExtension('fujidana.spec-data')) {
			// The "preview graph" feature is enabled only when the "spec-data" extension is installed.
			// Therefore, we skip this test if the extension is not installed.
			console.log('The "spec-data" extension is not installed; skipping code lens test.');
			this.skip();
		}

		const codeLenses = await vscode.commands.executeCommand<vscode.CodeLens[]>('vscode.executeCodeLensProvider', document.uri);
		assert.ok(codeLenses, 'No code lenses returned.');
		assert.ok(codeLenses.length > 0, 'No code lenses found in the document.');
	});
});
