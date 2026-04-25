using namespace System.Management.Automation
using namespace System.Management.Automation.Language
using namespace System.Text

Register-ArgumentCompleter -Native -CommandName kindly -ScriptBlock {
    param(
        [string] $WordToComplete,
        [CommandAst] $CommandAst,
        [int] $CursorPosition
    )

    [Console]::InputEncoding = [Encoding]::UTF8
    [Console]::OutputEncoding = [Encoding]::UTF8
    $OutputEncoding = [Encoding]::UTF8

    $env:COLUMNS = (Get-Host).UI.RawUI.WindowSize.Width

    $args = @()

    $_, $xs = $CommandAst.CommandElements

    foreach ($x in $xs) {
        if ($x.Extent.StartOffset -gt $CursorPosition) {
            break
        }

        $args += $x.Extent
    }

    if (-not $WordToComplete) {
        $args += ""
    }

    & kindly --cue pwsh -- @args 2>$null | % {
        $xs = $_ -split "`t"

        $completion = @($xs[0]) * 3

        foreach ($i in 1..2) {
            if ($xs[$i]) {
                $completion[$i] = $xs[$i]
            }
        }

        [CompletionResult]::new(
            $completion[0],
            $completion[1],
            [CompletionResultType]::ParameterValue,
            $completion[2]
        )
    }
}
