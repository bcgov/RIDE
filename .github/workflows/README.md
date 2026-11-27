# Github Workflows

### Initial Github Setup

The dev, test, uat, prod workflows need to have environment variables setup in OpenShift

Add these variables like this:
1. In Github go to Settings
1. Click Environments
1. Click New Environment
1. Give it a name (dev, test, uat, prod)
1. Add these Environment and Secret Variables
    1. Variable: `OPENSHIFT_NAMESPACE`
        - Use the project namespace with the `-dev` (ie `abc123-dev`)
    1. Variable: `OPENSHIFT_GOLD_SERVER`
        - This will be the API Server you see when you get your token from OpenShift
    1. Secret: `OPENSHIFT_GOLD_TOKEN`
        - Use the Pipeline Token (From `pipeline-token-xxxxxxxx` secret)
    1. Variable: `OPENSHIFT_GOLDDR_SERVER`
        - This will be the API Server you see when you get your token from OpenShift
    1. Secret: `OPENSHIFT_GOLDDR_TOKEN`
        - Use the Pipeline Token (From `pipeline-token-xxxxxxxx` secret)


# Workflows
### 1a. Build & Deploy to PR Branch
- **What:** Generates new images and deploys a same-repository PR into an ephemeral environment with a seeded DB. IDIR Admins are set using the `PR_ADMIN_IDIRS` dev environment variable in GitHub in a `USERNAME,USERNAME` format.
- **Trigger:** PR creation, updates, marking the PR ready for review, and removing the `No Preview` label. An environment is deployed only when the PR is ready for review (not a draft) and does not have the `No Preview` label:

    | PR state | Preview |
    | --- | --- |
    | Draft | No |
    | Ready for review | Yes |
    | Ready for review with `No Preview` | No |

    Fork PRs do not get environments.
- **Comment:** Once deployed, the workflow posts a comment with the app, Django admin, pods and Helm release URLs, and updates the same comment on later deploys.
- **Cleanup:** Converting the PR to a draft, adding `No Preview`, or closing the PR tears down its environment and deletes the URL comment. Deploy and cleanup runs are serialized per PR; ineligible deploy events do not compete with cleanup.
- **Image Tags:** `pr-###` and `sha`

### 1b. Build & Deploy to Dev
- **What:** Generates a new image from the code in `main` and deploys to Gold/GoldDR
- **Trigger:** Manual or on push to `main` branch
- **Image Tags:** `latest`, `latest-dev`, and `sha` 

### 2. Build & Deploy to Test
- **Purpose:** Generates a Git tag starting with `b` and increments that number. It will then build and deploy new images to Gold/GoldDR
- **Trigger:** Manual
- **Purpose:** Builds latest image from main and pushes to Gold and Gold DR
- **Image Tags:** `latest`, `latest-test`, `b##` and `sha` 

### 3. Build & Deploy to UAT
- **Purpose:** Generates a Git tag starting with `rc` and increments that number. It will then build and deploy new images to Gold/GoldDR
- **Trigger:** Manual
- **Image Tags:** `latest`, `latest-uat`, `rc##` and `sha` 
- **NOTE:** This should be run from a `releases` branch

### Deploy to Prod
- **Purpose:** Promote the selected image tag from UAT to Prod
- **Trigger:** Manual by doing these steps:
    1. Go to `Releases` on the main Github Page
    1. Click `Draft a new release`
    1. Chose the tag you want to push to prod
    1. Click `Generate release notes`
    1. Give it a title (Default will be the tag which we do not want)
    1. Click `Publish Release`

### Zap Scan
- **Purpose:** Automatically runs a OWASP ZAP Scan against dev. Results can be found on the issues tab
- **Trigger:** Automatic on Sundays at 1am

### Weekly Trivy Image Scans
- **Purpose:** To identify any `HIGH` or `CRITICAL` vulnerabilities in the images. Results are uploaded to the Github Security Tab
- **Trigger:** Automatic on Sundays at 2am

### Cleanup PR
- **Purpose:** Removes the PR application, its temporary database, and the preview URL comment.
- **Trigger:** When a PR is converted to a draft, when `No Preview` is added, when a PR is closed, or when run manually with a PR number. Manual cleanup does not change the PR's labels or draft status, so a later eligible PR update can deploy the environment again with a clean database.

