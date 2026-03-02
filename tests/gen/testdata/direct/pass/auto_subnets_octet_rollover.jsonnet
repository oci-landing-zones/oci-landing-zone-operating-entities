(import 'gen/config.libsonnet').auto_subnets(
  '10.0.252.0/21',
  [
    { name: 'a', size: '/24' },
    { name: 'b', size: '/24' },
    { name: 'c', size: '/24' },
    { name: 'd', size: '/24' },
    { name: 'e', size: '/24' },
    { name: 'f', size: '/24' },
    { name: 'g', size: '/24' },
    { name: 'h', size: '/24' },
  ]
)
