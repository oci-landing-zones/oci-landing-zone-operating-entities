import json
import unittest
from pathlib import Path
from tests.gen.helpers import REPO_ROOT
from tests.gen.test_static_cost_tags import REQUIRED, COLLECTIONS, walk


class GeneratedCostTagCoverageTests(unittest.TestCase):
    def test_published_extension_and_addon_resources_have_all_six_tags(self):
        collections = COLLECTIONS | {'clusters', 'node_pools', 'virtual_node_pools', 'ocvs_clusters', 'streams'}
        checked = 0
        files = []
        for source_root in ('gen/workload-extensions', 'gen/addons'):
            for source in (REPO_ROOT / source_root).rglob('*.jsonnet'):
                relative = source.relative_to(REPO_ROOT / 'gen').with_suffix('.json')
                filename = REPO_ROOT / relative
                if filename.exists():
                    files.append(filename)
        self.assertTrue(files)
        for filename in files:
            doc = json.loads(filename.read_text())
            for path, resource in walk(doc):
                if len(path) > 1 and path[-2] in collections or path and path[-1] == 'default_security_list':
                    location = str(filename.relative_to(REPO_ROOT)) + '/' + '/'.join(path)
                    self.assertTrue(REQUIRED.issubset(resource.get('defined_tags', {})), location)
                    checked += 1
        self.assertGreater(checked, 100)
