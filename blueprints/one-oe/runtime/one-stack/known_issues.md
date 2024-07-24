# **OCI Open LZ &ndash; [One-OE Blueprint](#) &ndash; Known Issues**

&nbsp; 


## Cannot delete a compartment that it is still associated to a Security Zone.

While destroying your stack you might see the following error:

```
Error: 400-InvalidParameter, Delete compartment is not allowed because compartment is still associated to a Security Zone.

Suggestion: Please update the parameter(s) in the Terraform config as per error message Delete compartment is not allowed because compartment is still associated to a Security Zone.

```

If you see it, you would need to disable Cloud Guard manually from the console:
Main Menu -> Identity and Security -> Cloud Guard -> Configuration -> Disable Cloud Guard

Then, apply remove the conflicting compartment manually and proceed with the Stack destroy operation.

&nbsp; 

## Cannot delete a compartment that it is still associated to a Security Zone.

While destroying your stack you might see the following error:

```
Error: 400-InvalidParameter, Delete compartment is not allowed because compartment is still associated to a Security Zone.

Suggestion: Please update the parameter(s) in the Terraform config as per error message Delete compartment is not allowed because compartment is still associated to a Security Zone.

```

If you see it, you would need to disable Cloud Guard manually from the console:
Main Menu -> Identity and Security -> Cloud Guard -> Configuration -> Disable Cloud Guard

Then, apply remove the conflicting compartment manually and proceed with the Stack destroy operation.



&nbsp; 

# License

Copyright (c) 2024 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](LICENSE) for more details.


&nbsp; 