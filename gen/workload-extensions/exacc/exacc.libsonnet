local builder = import './exacc_builder.libsonnet';
local wrapper = import '../extension_wrapper.libsonnet';

wrapper.fromBuilder(builder)
