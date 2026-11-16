"""Evaluate the FinOps Terraform tag contract without a provider or OCI access."""
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

from tests.gen.helpers import jsonnet_command, run_cmd


ROOT = Path(__file__).resolve().parents[2]
MODULE = ROOT / "addons/oci-finops/finops-setup/terraform"
PREFIX = "tagns-lz-cost-governance.tag-lz-"


class FinopsTagTests(unittest.TestCase):
    def evaluate(self, **overrides):
        inputs = {key: "test-placeholder" for key in (
            "tenancy_ocid", "adb_compartment_id", "private_subnet_id", "secret_ocid", "nsg_id"
        )}
        inputs.update(overrides)
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory)
            shutil.copyfile(MODULE / "variables.tf", target / "variables.tf")
            shutil.copyfile(MODULE / "tags.tf", target / "tags.tf")
            validation = subprocess.run(
                ["terraform", "validate", "-no-color"], cwd=target,
                text=True, capture_output=True, check=False,
            )
            self.assertEqual(validation.returncode, 0, validation.stdout + validation.stderr)
            arguments = [
                f"-var={key}={value if isinstance(value, str) else json.dumps(value)}"
                for key, value in inputs.items()
            ]
            result = subprocess.run(
                ["terraform", "console", "-no-color", *arguments], cwd=target,
                input="jsonencode({iam = local.iam_defined_tags, database = local.database_defined_tags})\n",
                text=True, capture_output=True, check=False,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            return json.loads(json.loads(result.stdout))

    def test_default_keeps_six_published_tags(self):
        tags = self.evaluate()
        self.assertEqual(len(tags["iam"]), 6)
        self.assertEqual(tags["iam"][PREFIX + "platform"], "tobedefined")
        self.assertEqual(tags["database"], {**tags["iam"], PREFIX + "platform": "finops"})

    def test_disabled_generates_no_automatic_tags(self):
        self.assertEqual(self.evaluate(enable_cost_governance_tags=False), {"iam": {}, "database": {}})

    def test_disabled_preserves_explicit_customer_tags(self):
        custom = {"customer.team": "analytics", PREFIX + "owner": "owner@example.com"}
        self.assertEqual(self.evaluate(enable_cost_governance_tags=False, defined_tags=custom),
                         {"iam": custom, "database": custom})

    def test_enabled_preserves_overrides_and_database_platform(self):
        tags = self.evaluate(defined_tags={PREFIX + "cost-center": "CC42", PREFIX + "platform": "custom", "customer.team": "analytics"})
        for values in tags.values():
            self.assertEqual(values[PREFIX + "cost-center"], "CC42")
            self.assertEqual(values["customer.team"], "analytics")
        self.assertEqual(tags["iam"][PREFIX + "platform"], "custom")
        self.assertEqual(tags["database"][PREFIX + "platform"], "finops")

    def test_database_override_preserves_common_iam_tags(self):
        tags = self.evaluate(
            defined_tags={PREFIX + "cost-center": "QA_IAM", "customer.team": "analytics"},
            database_defined_tags={PREFIX + "cost-center": "QA_DATABASE"},
        )
        self.assertEqual(tags["iam"][PREFIX + "cost-center"], "QA_IAM")
        self.assertEqual(tags["database"][PREFIX + "cost-center"], "QA_DATABASE")
        self.assertEqual(tags["database"]["customer.team"], "analytics")

    def test_custom_qa_mapping_reaches_iam_network_and_database(self):
        result = run_cmd([
            jsonnet_command(), "--tla-code-file",
            "config=" + str(ROOT / "tests/addons/testdata/finops_qa.jsonnet"),
            "--tla-str", "environment=qa",
            str(MODULE.parent / "customize_tags.jsonnet"),
        ])
        files = json.loads(result.stdout)
        network = files["finops_network.auto.tfvars.json"]["network_configuration"]
        categories = network["network_configuration_categories"]
        vcn = categories["finops"]["vcns"]["VCN-FRA-LZP-P-FINOPS-KEY"]
        self.assertEqual(vcn["defined_tags"][PREFIX + "environment"], "qa")
        self.assertEqual(vcn["defined_tags"][PREFIX + "cost-center"], "QA_NETWORK")
        hub = categories["shared"]["vcns"]["VCN-FRA-LZP-HUB-KEY"]
        self.assertEqual(hub["defined_tags"][PREFIX + "environment"], "shared")
        self.assertEqual(hub["defined_tags"][PREFIX + "cost-center"], "SHARED")
        iam = files["finops_iam.auto.tfvars.json"]
        group = iam["groups_configuration"]["groups"]["GRP-LZP-PLATFORM-FINOPS-ADMINS"]
        self.assertEqual(group["defined_tags"][PREFIX + "cost-center"], "QA_IAM")
        actual = self.evaluate(**files["finops_adb.auto.tfvars.json"])
        for role, center in [("iam", "QA_IAM"), ("database", "QA_DATABASE")]:
            self.assertEqual(actual[role][PREFIX + "environment"], "qa")
            self.assertEqual(actual[role][PREFIX + "owner"], "qa.owner@example.test")
            self.assertEqual(actual[role][PREFIX + "cost-center"], center)
            self.assertEqual(actual[role][PREFIX + "business-unit"], "Quality Assurance")


if __name__ == "__main__":
    unittest.main()
