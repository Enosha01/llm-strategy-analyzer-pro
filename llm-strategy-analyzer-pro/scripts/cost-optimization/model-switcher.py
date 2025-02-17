import os
import requests
from kubernetes import client, config

LLM_THRESHOLDS = {
    'gpt-4': 0.10,  # $0.10 per request
    'claude-3': 0.15,
    'mixtral': 0.002
}

def switch_model(deployment: str, new_model: str):
    config.load_kube_config()
    api = client.AppsV1Api()
    
    # Get current deployment
    dep = api.read_namespaced_deployment(deployment, "production")
    
    # Update environment variable
    for container in dep.spec.template.spec.containers:
        if container.name == "llm-gateway":
            container.env = [
                e if e.name != "LLM_MODEL" 
                else client.V1EnvVar(name="LLM_MODEL", value=new_model) 
                for e in container.env
            ]
    
    # Apply update
    api.patch_namespaced_deployment(deployment, "production", dep)

if __name__ == "__main__":
    current_cost = float(os.getenv("CURRENT_COST", "0.0"))
    
    if current_cost > 50:
        switch_model("llm-gateway", "mixtral")
    elif current_cost > 30:
        switch_model("llm-gateway", "claude-3")
    else:
        switch_model("llm-gateway", "gpt-4")