// Event names from Oracle's ExaDB-XS Events reference.
local phases(operation) = [
  'com.oraclecloud.DatabaseService.%s.%s' % [operation, phase]
  for phase in ['begin', 'end']
];
{
  vault: std.flattenArrays([
    phases(operation)
    for operation in [
      'CreateExascaleDbStorageVault',
      'UpdateExascaleDbStorageVault',
      'DeleteExascaleDbStorageVault',
      'ChangeExascaleDbStorageVaultCompartment',
    ]
  ]),
  cluster: std.flattenArrays([
    phases(operation)
    for operation in [
      'CreateExadbVmCluster',
      'UpdateExadbVmCluster',
      'DeleteExadbVmCluster',
      'ChangeExadbVmClusterCompartment',
      'ExadbVmClusterTerminateVirtualMachine',
    ]
  ]),
  database: [
    'com.oraclecloud.databaseservice.updatedatabase.begin',
    'com.oraclecloud.databaseservice.updatedatabase.end',
    'com.oraclecloud.databaseservice.deletedatabase.begin',
    'com.oraclecloud.databaseservice.deletedatabase.end',
    'com.oraclecloud.databaseservice.restoredatabase.begin',
    'com.oraclecloud.databaseservice.restoredatabase.end',
  ],
}
