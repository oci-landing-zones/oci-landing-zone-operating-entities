// Multi-OE config mode renders two OEs with repeated environment names without key collisions.
// contains: "CMP-LZ-FINANCE-KEY"
// contains: "CMP-LZ-FINANCE-PROD-KEY"
// contains: "CMP-LZ-RETAIL-BANK-PROD-KEY"
// contains: "VCN-FRA-LZ-FINANCE-PROD-PROJECTS-KEY"
// contains: "VCN-FRA-LZ-RETAIL-BANK-PROD-PROJECTS-KEY"
// contains: cmp-lz-finance:cmp-lz-finance-prod:cmp-lz-finance-prod-network
// contains: cmp-lz-retail-bank:cmp-lz-retail-bank-prod:cmp-lz-retail-bank-prod-network
{
  region: 'eu-frankfurt-1',
  region_short_name: 'fra',
  security_targets: ['prod'],
  hub: { kind: 'hub_a', network: { vcn: '10.0.0.0/21' } },
  operating_entities: {
    finance: {
      environments: {
        prod: {
          shared_project_network: { network: { vcn: '10.0.64.0/21' } },
          projects: { proj1: {} },
        },
        preprod: {
          shared_project_network: { network: { vcn: '10.0.128.0/21' } },
          projects: { proj1: {} },
        },
      },
    },
    retail_bank: {
      environments: {
        prod: {
          shared_project_network: { network: { vcn: '10.1.64.0/21' } },
          projects: { proj1: {} },
        },
        preprod: {
          shared_project_network: { network: { vcn: '10.1.128.0/21' } },
          projects: { proj1: {} },
        },
      },
    },
  },
}
