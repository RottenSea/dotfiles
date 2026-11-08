try
{
    [Console]::InputEncoding = [System.Text.Encoding]::UTF8
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    $OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    chcp 65001 > $null
} catch
{
}

# DefaultPath
$defaultPaths = @(
    "$env:windir\System32"
)

if ($PWD.Path -in $defaultPaths)
{
    Set-Location "$env:USERPROFILE"
}

Clear-Host

# fnm
if (Get-Command fnm -ErrorAction SilentlyContinue)
{
    fnm env --use-on-cd --shell powershell | Out-String | Invoke-Expression
}

# Fastfetch
if (Get-Command fastfetch -ErrorAction SilentlyContinue)
{
    fastfetch
}
