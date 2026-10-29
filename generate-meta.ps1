# generate-meta.ps1
# Генерирует mvpsounds-meta.json из дат модификации mp3 в папке audios/
# Используется как источник дат для плеера (на GitHub Pages нет серверного кода).

$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$proj = Join-Path $dir 'audios'
$out = Join-Path $dir 'mvpsounds-meta.json'

if (-not (Test-Path $proj)) {
    Write-Host 'ERROR: audios folder not found'
    exit 1
}

$files = Get-ChildItem -LiteralPath $proj -Filter *.mp3 | Sort-Object { [int]$_.BaseName }

if (-not $files) {
    Write-Host 'No mp3 files found in audios'
    exit 1
}

$pairs = @($files | ForEach-Object {
    '"{0}": {{"modified": "{1}"}}' -f [int]$_.BaseName, $_.LastWriteTime.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss')
})

$json = '{ ' + ($pairs -join ', ') + ' }'
[System.IO.File]::WriteAllText($out, $json, (New-Object System.Text.UTF8Encoding($false)))

Write-Host ('Generated: ' + $out + '  (records: ' + $files.Count + ')')