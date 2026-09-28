$ErrorActionPreference = 'Stop'

function Get-LanIPv4 {
  Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
      $_.IPAddress -notlike '127.*' -and
      $_.PrefixOrigin -ne 'WellKnown' -and
      $_.IPAddress -notlike '169.254.*' -and
      $_.InterfaceAlias -notlike 'vEthernet*' -and
      $_.InterfaceAlias -notlike '*WSL*' -and
      $_.InterfaceAlias -notlike '*Loopback*'
    } |
    Select-Object -ExpandProperty IPAddress -First 1
}

$lan = Get-LanIPv4
Write-Output 'Стол слушает порт 8080.'
if ($lan) {
  Write-Output "Та же сеть: http://${lan}:8080"
}
else {
  Write-Output 'Локальный IPv4 не найден.'
}

$tailscale = Get-Command tailscale -ErrorAction SilentlyContinue
if ($tailscale) {
  $ts = (& tailscale ip -4 2>$null | Select-Object -First 1)
  if ($ts) {
    Write-Output "Tailscale: http://${ts}:8080"
  }
}
else {
  Write-Output 'Tailscale не установлен — для друзей из другой сети поставь его и запусти скрипт снова.'
}

Write-Output 'Если открыт localhost, друзья по этой ссылке не зайдут. Отдай им адрес выше.'
