param(
  [int]$MaxDepth = 2,
  [int]$MaxPages = 500,
  [switch]$SkipDownload
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13

$requestHeaders = @{
  'User-Agent' = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
  'Accept' = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
  'Accept-Language' = 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
}

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$outputRoot = Join-Path $root 'references\game-assets\muonlinefanz\site-mirror'
$originalRoot = Join-Path $outputRoot 'original'
$manifestPath = Join-Path $outputRoot 'image-manifest.json'
$pagesPath = Join-Path $outputRoot 'source-pages.json'
$reportPath = Join-Path $outputRoot 'download-report.json'
$seedPath = Join-Path $outputRoot 'source-seeds.json'

New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null
New-Item -ItemType Directory -Force -Path $originalRoot | Out-Null

$allowedPrefixes = @(
  'https://muonlinefanz.com/guide/',
  'https://muonlinefanz.com/tools/items/',
  'https://muonlinefanz.com/tools/mobs/',
  'https://muonlinefanz.com/tools/maps/'
)

function Normalize-Url {
  param([string]$Url, [string]$BaseUrl)

  if ([string]::IsNullOrWhiteSpace($Url)) {
    return $null
  }

  $clean = $Url.Trim()

  if ($clean.StartsWith('//')) {
    $clean = "https:$clean"
  }

  try {
    if ($BaseUrl) {
      return ([Uri]::new([Uri]::new($BaseUrl), $clean)).AbsoluteUri.Split('#')[0]
    }

    return ([Uri]::new($clean)).AbsoluteUri.Split('#')[0]
  } catch {
    return $null
  }
}

function Test-IsAllowedPage {
  param([string]$Url)

  if ([string]::IsNullOrWhiteSpace($Url)) {
    return $false
  }

  foreach ($prefix in $allowedPrefixes) {
    if ($Url.StartsWith($prefix)) {
      return $true
    }
  }

  return $false
}

function Test-IsUsableUrl {
  param([string]$Url)

  if ([string]::IsNullOrWhiteSpace($Url)) {
    return $false
  }

  if ($Url -match '\$\{|%7B|%7D|%60|`') {
    return $false
  }

  return $true
}

function Test-IsImageUrl {
  param([string]$Url)

  return $Url -match '\.(png|jpe?g|gif|webp|bmp)(\?.*)?$'
}

function Get-SafeFileName {
  param([string]$Url)

  $uri = [Uri]::new($Url)
  $path = [Uri]::UnescapeDataString($uri.AbsolutePath.Trim('/'))
  if ([string]::IsNullOrWhiteSpace($path)) {
    $path = 'index'
  }

  $name = $path -replace '[\\/:*?"<>|]+', '_'
  $name = $name -replace '\s+', '-'

  if (-not (Test-IsImageUrl $name)) {
    $name = "$name.bin"
  }

  return $name
}

function Get-SeedUrls {
  $textFiles = @(
    (Join-Path $root 'data\externalMuReferences.ts')
  )

  $textFiles += Get-ChildItem -Path (Join-Path $root 'references\game-data') -Recurse -File -Include *.md,*.json |
    Select-Object -ExpandProperty FullName

  $urls = [System.Collections.Generic.HashSet[string]]::new()

  if (Test-Path $seedPath) {
    $seedJson = Get-Content -Raw -Path $seedPath | ConvertFrom-Json
    foreach ($seed in $seedJson.sources) {
      $url = Normalize-Url -Url $seed.url -BaseUrl $null
      if ((Test-IsUsableUrl $url) -and (Test-IsAllowedPage $url)) {
        [void]$urls.Add($url)
      }
    }
  }

  foreach ($file in $textFiles) {
    if (-not (Test-Path $file)) {
      continue
    }

    $text = Get-Content -Raw -Path $file
    foreach ($match in [regex]::Matches($text, 'https://muonlinefanz\.com/[^\s"''),\]]+')) {
      $url = Normalize-Url -Url $match.Value -BaseUrl $null
      if ((Test-IsUsableUrl $url) -and (Test-IsAllowedPage $url)) {
        [void]$urls.Add($url)
      }
    }
  }

  return @($urls)
}

function Extract-AssetUrls {
  param([string]$Html, [string]$PageUrl)

  $assets = [System.Collections.Generic.HashSet[string]]::new()

  foreach ($match in [regex]::Matches($Html, '<img[^>]+(?:src|data-src)=["'']([^"'']+)["'']', 'IgnoreCase')) {
    $url = Normalize-Url -Url $match.Groups[1].Value -BaseUrl $PageUrl
    if ($url -and (Test-IsImageUrl $url)) {
      [void]$assets.Add($url)
    }
  }

  foreach ($match in [regex]::Matches($Html, 'url\(["'']?([^)"'']+)["'']?\)', 'IgnoreCase')) {
    $url = Normalize-Url -Url $match.Groups[1].Value -BaseUrl $PageUrl
    if ($url -and (Test-IsImageUrl $url)) {
      [void]$assets.Add($url)
    }
  }

  return @($assets)
}

function Extract-PageLinks {
  param([string]$Html, [string]$PageUrl)

  $links = [System.Collections.Generic.HashSet[string]]::new()

  foreach ($match in [regex]::Matches($Html, '<a[^>]+href=["'']([^"'']+)["'']', 'IgnoreCase')) {
    $url = Normalize-Url -Url $match.Groups[1].Value -BaseUrl $PageUrl
    if ($url -and (Test-IsAllowedPage $url)) {
      [void]$links.Add($url)
    }
  }

  return @($links)
}

$queue = [System.Collections.Queue]::new()
$visited = [System.Collections.Generic.HashSet[string]]::new()
$allPages = [System.Collections.Generic.List[object]]::new()
$allImagesByUrl = @{}
$report = [System.Collections.Generic.List[object]]::new()

foreach ($url in (Get-SeedUrls)) {
  $queue.Enqueue([pscustomobject]@{ Url = $url; Depth = 0; Parent = $null })
}

while ($queue.Count -gt 0 -and $visited.Count -lt $MaxPages) {
  $entry = $queue.Dequeue()
  if ($visited.Contains($entry.Url)) {
    continue
  }

  [void]$visited.Add($entry.Url)
  Write-Host "Reading $($entry.Url)"

  try {
    $response = Invoke-WebRequest -Uri $entry.Url -UseBasicParsing -TimeoutSec 30 -Headers $requestHeaders
    $html = $response.Content

    $images = Extract-AssetUrls -Html $html -PageUrl $entry.Url
    $links = Extract-PageLinks -Html $html -PageUrl $entry.Url

    $allPages.Add([pscustomobject]@{
      url = $entry.Url
      depth = $entry.Depth
      parent = $entry.Parent
      status = 'ok'
      imageCount = $images.Count
      internalLinkCount = $links.Count
    }) | Out-Null

    foreach ($imageUrl in $images) {
      if (-not $allImagesByUrl.ContainsKey($imageUrl)) {
        $allImagesByUrl[$imageUrl] = [pscustomobject]@{
          url = $imageUrl
          firstSeenOn = $entry.Url
          localPath = $null
          status = 'pending-download'
          error = $null
        }
      }
    }

    if ($entry.Depth -lt $MaxDepth) {
      foreach ($link in $links) {
        if (-not $visited.Contains($link)) {
          $queue.Enqueue([pscustomobject]@{ Url = $link; Depth = ($entry.Depth + 1); Parent = $entry.Url })
        }
      }
    }
  } catch {
    $allPages.Add([pscustomobject]@{
      url = $entry.Url
      depth = $entry.Depth
      parent = $entry.Parent
      status = 'error'
      error = $_.Exception.Message
      imageCount = 0
      internalLinkCount = 0
    }) | Out-Null
  }
}

if (-not $SkipDownload) {
  foreach ($image in $allImagesByUrl.Values) {
    $fileName = Get-SafeFileName -Url $image.url
    $target = Join-Path $originalRoot $fileName
    $image.localPath = $target.Substring($root.Length + 1)

    try {
      Invoke-WebRequest -Uri $image.url -OutFile $target -UseBasicParsing -TimeoutSec 30 -Headers $requestHeaders
      $image.status = 'downloaded'
    } catch {
      $image.status = 'download-error'
      $image.error = $_.Exception.Message
    }

    $report.Add([pscustomobject]@{
      url = $image.url
      localPath = $image.localPath
      status = $image.status
      error = $image.error
    }) | Out-Null
  }
}

$manifest = [pscustomobject]@{
  source = 'muonlinefanz.com'
  capturedAt = (Get-Date).ToString('s')
  maxDepth = $MaxDepth
  maxPages = $MaxPages
  downloadAttempted = (-not $SkipDownload.IsPresent)
  pageCount = $allPages.Count
  imageCount = $allImagesByUrl.Count
  notes = @(
    'Crawler follows allowed MU Online Fanz guide/tools pages, including internal navigation links and footer/next-option buttons.',
    'Source images are mirrored as original references only.',
    'Optimized Blood Moon versions should be generated separately.'
  )
  images = @($allImagesByUrl.Values | Sort-Object url)
}

$allPages | ConvertTo-Json -Depth 6 | Set-Content -Path $pagesPath -Encoding UTF8
$manifest | ConvertTo-Json -Depth 8 | Set-Content -Path $manifestPath -Encoding UTF8
$report | ConvertTo-Json -Depth 6 | Set-Content -Path $reportPath -Encoding UTF8

Write-Host "Pages: $($allPages.Count)"
Write-Host "Images: $($allImagesByUrl.Count)"
Write-Host "Manifest: $manifestPath"
