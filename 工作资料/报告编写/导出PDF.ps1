$ErrorActionPreference='Stop'
$docx='C:\Users\xuson\Desktop\软工实验2\工作资料\实验报告初稿.docx'
$pdf='C:\Users\xuson\Desktop\软工实验2\实验报告初稿.pdf'
$previousWord=@(Get-Process WINWORD -ErrorAction SilentlyContinue)
$word=$null;$document=$null
try {
 $word=New-Object -ComObject Word.Application
 $word.Visible=$false;$word.DisplayAlerts=0
 $document=$word.Documents.Open($docx,$false,$true)
 $document.Repaginate()
 $document.ExportAsFixedFormat($pdf,17)
 [pscustomobject]@{PDF=$pdf;Pages=$document.ComputeStatistics(2)} | ConvertTo-Json -Compress
} finally {
 if($null -ne $document){$document.Close(0);[void][Runtime.InteropServices.Marshal]::ReleaseComObject($document)}
 if($null -ne $word){if($previousWord.Count -eq 0){$word.Quit()};[void][Runtime.InteropServices.Marshal]::ReleaseComObject($word)}
}
