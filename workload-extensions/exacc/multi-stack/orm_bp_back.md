


# **ORM Best Practices**



### Overview

Oracle Resource Manager automates infrastructure deployment using Terraform with automatic state file management, ensures consistency across environments with reusable version-controlled configurations, and is a free service integrated with OCI security and governance features.


The one-stack solution is designed to speed up the time needed to implement the one-oe blueprint. 

By default, when you click the "Deploy to Oracle Cloud" button, a new stack in ORM is created containing the orchestrator code and links to all required JSON configuration files. However, these JSON files point to our public OE GitHub repository.

We highly recommend storing your own copy of these files, and there are two main options:

1. Store your files in an OCI Object Storage bucket.
2. Store the files in a private GitHub repository.

The first option works well for demos and quick deployments. However, if you plan to customize and edit the JSON files regularly, the second option provides better flexibility—enabling version tracking, collaborative editing, and easier change management.

The required steps for option two are:


| step | description |
|------|-------------|
| 1. | **Create a private GitHub repository.** |
| 2. | **Populate your repository** with the required JSON files from the Operating Entities repository and make any necessary customizations. |
| 3. | **Generate a GitHub Personal Access Token:** Go to your GitHub account: Settings > Developer Settings > Personal Access Tokens > Tokens (Classic) > Generate New Token.<br><br><img src="../../../../commons/images/token.png" width="400"><br><br>Select at minimum the **repo** scope to grant full control of private repositories. |
| 4. | **Update the ORM stack configuration:**<br><br>• Edit your ORM stack and navigate to **Input Files** section<br>• Under Configuration Source, select **GitHub**<br>• Paste your GitHub token in the authentication field<br>• Remove the pre-existing configuration file URLs and replace them with your private repository file paths<br><br><img src="../../../../commons/images/github.png" width="700"> <br> If you are using a private GitHub repository, leave the GitHub Base URL field empty, if you are using an organization account, set it to **api.github.com** and if you are using an enterprise account, use your company’s GitHub URL (e.g., company.github.com) |


The Orchestrator provides an ORM Facade module allowing these three options:

| Configurations Source | Configuration Files Formats | Dependencies Sources | Dependency Files Formats | Requirements |
|----------------------|----------------------------|---------------------|-------------------------|--------------|
| Private GitHub repository | JSON, YAML | Same private GitHub repository | JSON | GitHub token with read/(write, if saving output) access permissions on the private GitHub repository. |
| Private OCI bucket | JSON, YAML | Same private OCI bucket | JSON | OCI IAM permissions to read/(write, if saving output) to the private OCI bucket. |
| Plain Public URLs | JSON, YAML | Private GitHub repository, private OCI bucket | JSON | URLs are reachable. Read/(write, if saving output) access permissions to private GitHub repository or private OCI bucket |

If you are running a Workload Extension with a multi-stack approach, you must use two stacks.
In the first stack, deploy the one-OE and enable the output feature to generate external dependency files such as compartments_output.json, network_output.json, or tags_output.json.
Then, in the Workload Extension stack, include all required files in the Dependencies Source for URL-based Configuration field.

For more details, refer to the orchestrator [documentation](https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator?tab=readme-ov-file#external-dependencies).



&nbsp; 

# License

Copyright (c) 2025 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
