// Multi-OE normalization defaults display_name and generates unique two-letter OE DNS labels.
local cfg = import 'gen/config.libsonnet';
local normalized = cfg.normalize({
  region: 'eu-frankfurt-1',
  region_short_name: 'fra',
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  operating_entities: {
    finance: {
      environments: {
        prod: {
          shared_project_network: { network: { vcn: '10.0.64.0/21' } },
          projects: { proj1: {} },
        },
      },
    },
    files: {
      display_name: 'File Services',
      environments: {
        prod: {
          shared_project_network: { network: { vcn: '10.0.128.0/21' } },
          projects: { proj1: {} },
        },
      },
    },
    retail_bank: {
      display_name: 'Retail Bank',
      dns: 'rb',
      environments: {
        prod: {
          shared_project_network: { network: { vcn: '10.1.64.0/21' } },
          projects: { proj1: {} },
        },
      },
    },
  },
});

{
  has_root_environments: std.objectHas(normalized, 'environments'),
  oe_names: std.objectFields(normalized.operating_entities),
  finance: {
    display_name: normalized.operating_entities.finance.display_name,
    dns: normalized.operating_entities.finance.dns,
  },
  files: {
    display_name: normalized.operating_entities.files.display_name,
    dns: normalized.operating_entities.files.dns,
  },
  retail_bank: {
    display_name: normalized.operating_entities.retail_bank.display_name,
    dns: normalized.operating_entities.retail_bank.dns,
  },
}
