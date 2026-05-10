{
  exacc: {
    code: 'exacc',
    display: 'ExaDB-C@C',
    infra_event_stem: 'exacc',
    tags: {
      admin: 'lz-exacc-admin',
      db: 'lz-exacc-db-admin',
      infra: 'lz-exacc-infra-admin',
    },
    resources: {
      infrastructure: 'exadata-infrastructures',
      vmclusters: 'vmclusters',
    },
  },

  exacs: {
    code: 'exacs',
    display: 'Exadata Database Service on Exascale Infrastructure',
    infra_event_stem: 'exacs',
    tags: {
      admin: 'lz-exacs-admin',
      db: 'lz-exacs-db-admin',
      infra: 'lz-exacs-infra-admin',
    },
    resources: {
      infrastructure: 'cloud-exadata-infrastructures',
      vmclusters: 'cloud-vmclusters',
    },
  },
}
