param(
    [Parameter(Mandatory = $true)]
    [string]$PdfPath,

    [string]$LanguageTag = "ar-SA"
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Add-Type -AssemblyName System.Runtime.WindowsRuntime

$null = [Windows.Foundation.IAsyncAction, Windows.Foundation, ContentType = WindowsRuntime]


$AsTaskForAction = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq "AsTask" -and -not $_.IsGenericMethodDefinition -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.FullName -eq "Windows.Foundation.IAsyncAction"
} | Select-Object -First 1

$AsTaskGenericDef = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq "AsTask" -and $_.IsGenericMethodDefinition -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
} | Select-Object -First 1

$AsTaskActionWithProgressDef = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq "AsTask" -and $_.IsGenericMethodDefinition -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncActionWithProgress`1'
} | Select-Object -First 1

function AwaitAction($Operation) {
    if ($null -eq $Operation) { return }

    # Some WinRT APIs return IAsyncAction, others IAsyncActionWithProgress<T>.
    try {
        $task = $AsTaskForAction.Invoke($null, @($Operation))
        $task.Wait() | Out-Null
        return
    } catch {
        # ignore and fallback
    }

    foreach ($progressType in @([uint32], [int], [double])) {
        try {
            $asTask = $AsTaskActionWithProgressDef.MakeGenericMethod(@($progressType))
            $task = $asTask.Invoke($null, @($Operation))
            $task.Wait() | Out-Null
            return
        } catch {
            # try next
        }
    }

    throw "Unsupported WinRT async action type."
}

function AwaitOperation($Operation, $ResultType) {
    if ($null -eq $Operation) { return $null }
    $asTask = $AsTaskGenericDef.MakeGenericMethod(@($ResultType))
    $task = $asTask.Invoke($null, @($Operation))
    $task.Wait() | Out-Null
    return $task.Result
}

if (-not (Test-Path -LiteralPath $PdfPath)) {
    throw "PDF file not found: $PdfPath"
}

$null = [Windows.Data.Pdf.PdfDocument, Windows.Data.Pdf, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
$null = [Windows.Media.Ocr.OcrEngine, Windows.Media.Ocr, ContentType = WindowsRuntime]
$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.InMemoryRandomAccessStream, Windows.Storage.Streams, ContentType = WindowsRuntime]
$null = [Windows.Globalization.Language, Windows.Globalization, ContentType = WindowsRuntime]

$language = [Windows.Globalization.Language]::new($LanguageTag)
$ocrEngine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($language)
if ($null -eq $ocrEngine) {
    $ocrEngine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
}
if ($null -eq $ocrEngine) {
    throw "Windows OCR engine is not available."
}

$storageFile = AwaitOperation ([Windows.Storage.StorageFile]::GetFileFromPathAsync($PdfPath)) ([Windows.Storage.StorageFile])
$pdfDocument = AwaitOperation ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($storageFile)) ([Windows.Data.Pdf.PdfDocument])

$allLines = New-Object System.Collections.Generic.List[string]

for ($pageIndex = 0; $pageIndex -lt $pdfDocument.PageCount; $pageIndex++) {
    $page = $pdfDocument.GetPage($pageIndex)
    try {
        $stream = [Windows.Storage.Streams.InMemoryRandomAccessStream]::new()
        AwaitAction ($page.RenderToStreamAsync($stream))
        $stream.Seek(0)

        $decoder = AwaitOperation ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
        $bitmap = AwaitOperation ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
        $ocrResult = AwaitOperation ($ocrEngine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])

        foreach ($line in $ocrResult.Lines) {
            $text = [string]$line.Text
            if (-not [string]::IsNullOrWhiteSpace($text)) {
                $allLines.Add($text.Trim())
            }
        }
    } finally {
        if ($stream) {
            $stream.Dispose()
        }
        $page.Dispose()
    }
}

[pscustomobject]@{
    text  = ($allLines -join "`n")
    lines = $allLines
} | ConvertTo-Json -Depth 4 -Compress

exit 0
