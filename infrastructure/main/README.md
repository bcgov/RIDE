# WebApp Chart

A chart to provision the RIDE WebApp.

## Initial Setup
To do the initial install in a namespace:
1. Ensure the Database is setup and running
1. Ensure Vault has all the required variables setup (and setup so they will work for both Gold/GoldDR)
1. Ensure the Values file looks correct for the environment
1. Do initial install in Gold with this command `helm install ENV-ride -f .\helm\values-ENV-gold.yaml .\helm`
1. Login to GoldDR Cluster
1. Do initial install in GoldDR with this command `helm install ENV-ride -f .\helm\values-ENV-gold.yaml -f .\helm\values-ENV-golddr.yaml .\helm`

## Creating RBAC
If it is the initial release and you are deploying from local, you can set `rbac.create: true`
If you are deploying later on, then run a command like this `helm template test-ride ./infrastructure/main -f ./infrastructure/main/values-test.yaml --set tasks.rbac.create=true --set redis.rbac.create=true --show-only charts/redis/templates/redis-rbac.yaml --show-only charts/tasks/templates/tasks-rbac.yaml > C:\Data\output.yaml` and import the RBAC's into Gold and GoldDR manually. The service account the CI/CD pipeline uses doesn't allow modifications of rbac's.


### OpenShift

- **Deployment**: Deployment resource that ensures the webapp is running with the desired replica count and resource requests/limits.
- **Service**: Exposes the webapp internally within the cluster.
- **Route**: Exposes the webapp externally with an optional IP restriction list.
- **Network Policy**: Configures network policies for securing communication between services.
- **Pod Disruption Budget**: Ensures availability by controlling voluntary disruptions to pods.
