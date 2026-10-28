from __future__ import annotations

import json
import unittest

from tests.gen.helpers import jsonnet_command, run_cmd


class OneOECostTagTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        code = """
local profiles = import 'gen/blueprints/one-oe/runtime/one-stack/profiles.libsonnet';
local publish = import 'gen/blueprints/one-oe/runtime/one-stack/output_builder.libsonnet';
local lz = import 'gen/landing_zone.libsonnet';
local p = publish(profiles.hub_e);
{
  iam: p.iam,
  network: p.network,
  observability: p.observability_cis1_pre,
  security: p.security_cis2,
  required: p.governance,
  bootstrap: lz(profiles.hub_e.config).governance,
  base_iam: lz(profiles.hub_e.config).iam,
  base_network: lz(profiles.hub_e.config).network,
  base_observability: lz(profiles.hub_e.config).observability_cis1_pre,
  base_security: lz(profiles.hub_e.config).security_cis2,
}
"""
        cls.outputs = json.loads(run_cmd([jsonnet_command(), "-e", code]).stdout)

    def test_published_governance_has_required_defaults_for_new_compartments(self) -> None:
        bootstrap = self.outputs["bootstrap"]["tags_configuration"]
        required = self.outputs["required"]["tags_configuration"]
        self.assertNotIn("default_defined_tags", required, "New tag definitions cannot use their own not-yet-created namespace")
        tags = required["namespaces"]["TAGNS-LZ-COST-GOVERNANCE-KEY"]["tags"]
        self.assertEqual(6, len(tags))
        for key, tag in tags.items():
            self.assertNotIn("tag_defaults", bootstrap["namespaces"]["TAGNS-LZ-COST-GOVERNANCE-KEY"]["tags"][key])
            self.assertIn("none", tag["valid_values"])
            self.assertEqual(1, len(tag["tag_defaults"]))
            default = next(iter(tag["tag_defaults"].values()))
            self.assertEqual(["CMP-LANDINGZONE-KEY"], default["compartment_ids"])
            self.assertIs(True, default["is_user_required"])
        self.assertIn("network", tags["TAG-LZ-PLATFORM-KEY"]["valid_values"])
        self.assertIn("security", tags["TAG-LZ-PLATFORM-KEY"]["valid_values"])
        self.assertIn("observability", tags["TAG-LZ-PLATFORM-KEY"]["valid_values"])

    def test_resource_scope_uses_function_not_only_location(self) -> None:
        categories = self.outputs["network"]["network_configuration"]["network_configuration_categories"]
        lb = categories["0-shared"]["non_vcn_specific_gateways"]["l7_load_balancers"]["LB-FRA-LZ-PROD-01-KEY"]
        self.assertEqual("prod", lb["defined_tags"]["tagns-lz-cost-governance.tag-lz-environment"])
        self.assertEqual("network", lb["defined_tags"]["tagns-lz-cost-governance.tag-lz-platform"])
        self.assertEqual("none", lb["defined_tags"]["tagns-lz-cost-governance.tag-lz-project"])
        nsg = categories["2-preprod"]["vcns"]["VCN-FRA-LZ-PREPROD-PROJECTS-KEY"]["network_security_groups"]["NSG-FRA-LZ-PREPROD-PROJ1-APP-KEY"]
        self.assertEqual("preprod", nsg["defined_tags"]["tagns-lz-cost-governance.tag-lz-environment"])
        self.assertEqual("proj1", nsg["defined_tags"]["tagns-lz-cost-governance.tag-lz-project"])
        for listener in lb["listeners"].values():
            self.assertNotIn("defined_tags", listener)

    def test_bucket_and_alarms_have_the_approved_scope(self) -> None:
        obs = self.outputs["observability"]
        bucket = obs["service_connectors_configuration"]["buckets"]["BKT-LZ-SERVICE-CONNECTOR-KEY"]
        self.assertEqual(6, len(bucket["defined_tags"]))
        self.assertEqual("shared", bucket["defined_tags"]["tagns-lz-cost-governance.tag-lz-environment"])
        alarm = obs["alarms_configuration"]["alarms"]["AL-LZ-PROD-VNIC-CONNTRACK-CRITICAL-KEY"]
        self.assertEqual("prod", alarm["defined_tags"]["tagns-lz-cost-governance.tag-lz-environment"])
        self.assertEqual("observability", bucket["defined_tags"]["tagns-lz-cost-governance.tag-lz-platform"])

    def test_security_resources_use_security_platform(self) -> None:
        security = self.outputs["security"]
        self.assertIn("default_defined_tags", security["cloud_guard_configuration"], "Cloned Cloud Guard recipes consume configuration-default tags")
        self.assertEqual("security", security["cloud_guard_configuration"]["default_defined_tags"]["tagns-lz-cost-governance.tag-lz-platform"])
        vaults = security["vaults_configuration"]
        for resource in list(vaults["vaults"].values()) + list(vaults["keys"].values()):
            self.assertEqual("security", resource["defined_tags"]["tagns-lz-cost-governance.tag-lz-platform"])
        for family, collection in (("cloud_guard_configuration", "targets"),
                                   ("scanning_configuration", "host_recipes"),
                                   ("security_zones_configuration", "security_zones")):
            for resource in security[family][collection].values():
                self.assertEqual("security", resource["defined_tags"]["tagns-lz-cost-governance.tag-lz-platform"])

    def test_compartment_platform_follows_network_and_security_roles(self) -> None:
        root = self.outputs["iam"]["compartments_configuration"]["compartments"]["CMP-LANDINGZONE-KEY"]
        platform = "tagns-lz-cost-governance.tag-lz-platform"
        for scope in (root, root["children"]["CMP-LZ-PROD-KEY"], root["children"]["CMP-LZ-PREPROD-KEY"]):
            for key, compartment in scope["children"].items():
                if key.endswith("-NETWORK-KEY"):
                    self.assertEqual("network", compartment["defined_tags"][platform], key)
                elif key.endswith("-SECURITY-KEY"):
                    self.assertEqual("security", compartment["defined_tags"][platform], key)
                else:
                    self.assertEqual("none", compartment["defined_tags"][platform], key)

    def test_tagging_preserves_every_other_configuration_field(self) -> None:
        def strip_cost_tags(value):
            if isinstance(value, list):
                return [strip_cost_tags(item) for item in value]
            if not isinstance(value, dict):
                return value
            result = {}
            for key, item in value.items():
                if key in ("defined_tags", "default_defined_tags") and isinstance(item, dict):
                    item = {k: v for k, v in item.items() if not k.startswith("tagns-lz-cost-governance.")}
                    if not item:
                        continue
                result[key] = strip_cost_tags(item)
            return result

        for family in ("iam", "network", "observability", "security"):
            self.assertEqual(strip_cost_tags(self.outputs["base_" + family]), strip_cost_tags(self.outputs[family]))


if __name__ == "__main__":
    unittest.main()
