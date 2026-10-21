const test = require('node:test');
const assert = require('node:assert/strict');
const { collectD2RenderDiagnostics, assertD2RenderSucceeded } = require('../../src/d2-diagnostics');

test('a single compiled HTML carries D2 failures to browser-free exporters', () => {
  const html = '<pre data-marpagent-render-error="d2" data-marpagent-render-code="D2_PROCESS_EXIT" data-marpagent-render-message="Bad &quot;node&quot; &lt;here&gt;" data-marpagent-source-line="17" data-marpagent-source-slide="3"><code>source</code></pre>';
  const diagnostics = collectD2RenderDiagnostics(html);
  assert.deepEqual(diagnostics, [{ engine: 'd2', code: 'D2_PROCESS_EXIT', message: 'Bad "node" <here>', line: 17, slide: 3 }]);
  assert.throws(() => assertD2RenderSucceeded(html), error => error.code === 'D2_RENDER_FAILED' && error.diagnostics[0].line === 17);
  assert.deepEqual(assertD2RenderSucceeded('<svg/>'), []);
  assert.deepEqual(collectD2RenderDiagnostics('<code>&lt;pre data-marpagent-render-error="d2"&gt;</code>'), []);
});
