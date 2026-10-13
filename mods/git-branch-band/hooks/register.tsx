import type { Register } from 'claude-code'

export const register: Register = on => {
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) {
      return next(e)
    }

    const { exitCode, stdout } = await $.process.run(['git', 'branch', '--show-current'])
    const branch = stdout.trim()

    if (exitCode !== 0 || branch === '') {
      return next(e)
    }

    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box>
        <Text color="green">⎇ {branch}</Text>
      </Box>
    )
  })
}
