import json
import unittest

from tests.gen.helpers import REPO_ROOT, run_cmd


class ExtensionContractTests(unittest.TestCase):
    def render_expr(self, expr: str) -> dict:
        proc = run_cmd(["jsonnet", "-J", str(REPO_ROOT), "-e", expr])
        return json.loads(proc.stdout)

    def test_resolve_uses_explicit_metadata_and_render_phases(self) -> None:
        snippet = r"""
local extensions = import 'gen/extensions.libsonnet';
local naming = import 'gen/naming.libsonnet';
local cfg_lib = {
  auto_subnets(vcn, subnet_specs): {
    [spec.name]: '%s::%s' % [vcn, spec.size]
    for spec in subnet_specs
  },
};
local registry = {
  fake: {
    metadata(params):: {
      default_subnets: { app: '/24' },
      subnet_order: ['app'],
    },
    render(params):: assert params.network.vcn != '' : 'render received blank vcn'; {
      network_pre: {
        fake_network: {
          cidr: params.network.vcn,
          subnet: params.network.subnets.app,
        },
      },
      iam: {},
    },
  },
};
extensions.resolve(
  cfg_lib,
  registry,
  [{
    scope: {
      scope_name: 'prod',
      platform_name: 'fake',
    },
    platform_config: {
      network: { vcn: '10.0.96.0/24', subnets: null },
      extension: { type: 'fake', params: {} },
    },
  }],
  naming('fra'),
  '10.0.0.0/21',
  []
)
"""
        rendered = self.render_expr(snippet)
        self.assertEqual(rendered["network_pre"]["fake_network"]["cidr"], "10.0.96.0/24")
        self.assertEqual(rendered["network_pre"]["fake_network"]["subnet"], "10.0.96.0/24::/24")

    def test_missing_required_contribution_uses_extension_type_in_error(self) -> None:
        snippet = r"""
local extensions = import 'gen/extensions.libsonnet';
local naming = import 'gen/naming.libsonnet';
local cfg_lib = {
  auto_subnets(vcn, subnet_specs): {
    [spec.name]: '%s::%s' % [vcn, spec.size]
    for spec in subnet_specs
  },
};
local registry = {
  fake_missing: {
    metadata(params):: {
      default_subnets: { app: '/24' },
      subnet_order: ['app'],
    },
    render(params):: {
      iam: {},
    },
  },
};
extensions.resolve(
  cfg_lib,
  registry,
  [{
    scope: {
      scope_name: 'prod',
      platform_name: 'fake',
    },
    platform_config: {
      network: { vcn: '10.0.96.0/24', subnets: null },
      extension: { type: 'fake_missing', params: {} },
    },
  }],
  naming('fra'),
  '10.0.0.0/21',
  []
)
"""
        proc = run_cmd(
            ["jsonnet", "-J", str(REPO_ROOT), "-e", snippet],
            expect_success=False,
        )
        self.assertNotEqual(proc.returncode, 0)
        stderr = proc.stderr or proc.stdout
        self.assertIn(
            'Extension "fake_missing" is missing required contribution "network_pre"',
            stderr,
        )
        self.assertNotIn("extension_type", stderr)


if __name__ == "__main__":
    unittest.main()
