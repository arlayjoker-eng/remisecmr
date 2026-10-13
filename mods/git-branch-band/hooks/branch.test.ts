import { test, expect } from 'claude-code/testing'

test('muestra la rama de git arriba del prompt', async ($, on) => {
  on('process.run', () => ({ value: { exitCode: 0, stdout: 'main\n', stderr: '' } }) as never)
  on('ui.render', () => ({ type: 'Box', props: {}, children: [] }) as never)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'git-branch-band', surface, component: 'AbovePrompt', props: {} as never })
    expect(await ui.find({ type: 'Text', text: /main/ })).toBeDefined()
    await ui.unmount()
  }
})

test('no muestra nada fuera de un repo', async ($, on) => {
  on('process.run', () => ({ value: { exitCode: 128, stdout: '', stderr: 'x' } }) as never)
  on('ui.render', () => ({ type: 'Box', props: {}, children: [] }) as never)
  const ui = await $.ui.mount({ plugin: 'git-branch-band', surface: 'terminal', component: 'AbovePrompt', props: {} as never })
  expect(await ui.find({ type: 'Text', text: /⎇/ })).toBeUndefined()
  await ui.unmount()
})
