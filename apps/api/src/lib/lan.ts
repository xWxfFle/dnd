import os from 'node:os'

const skipIface = /vEthernet|WSL|Loopback|docker|br-/i

export function listLanHosts() {
  const hosts: string[] = []
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    if (skipIface.test(name))
      continue
    for (const addr of addrs ?? []) {
      if (addr.internal)
        continue
      if (addr.family !== 'IPv4')
        continue
      if (addr.address.startsWith('169.254.'))
        continue
      hosts.push(addr.address)
    }
  }
  return [...new Set(hosts)]
}
