pipeline {
    agent any

    options {
        timeout(time: 1, unit: 'HOURS')
        buildDiscarder(logRotator(numToKeepStr: '10'))
        disableConcurrentBuilds()
        // ansiColor('xterm')
    }

    environment {
        // Docker Hub Registry Configuration
        // Jenkins Credentials ID containing username/password for Docker Hub
        DOCKERHUB_CREDS = credentials('dockerhub-creds') 
        
        // GitOps Config Repository Configuration
        // Jenkins Credentials ID (Username/Password or Token) for GitHub config repo
        GITHUB_CREDS = credentials('github-token')
        CONFIG_REPO_URL = 'github.com/mthang1201/vdtops-config.git'
        
        // Global variables initialized in stages
        GIT_TAG = ''
        DOCKER_USER = "${${DOCKERHUB_CREDS_USR}}"
    }

    stages {
        stage('Stage 1: Checkout Source') {
            steps {
                echo '=== [Stage 1] Checking out source repository ==='
                checkout scm
            }
        }

        stage('Stage 2: Read Git Tag') {
            steps {
                echo '=== [Stage 2] Resolving active Git Tag or Commit ==='
                script {
                    // Capture tag if it exists; fallback to short commit hash for testing branches
                    try {
                        GIT_TAG = sh(script: 'git describe --tags --exact-match 2>/dev/null', returnStdout: true).trim()
                        echo "Target Tag detected: ${GIT_TAG}"
                    } catch (Exception e) {
                        def commitHash = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
                        GIT_TAG = "v1.0.1-${commitHash}"
                        echo "Warning: No exact Git tag found. Falling back to build tag format: ${GIT_TAG}"
                    }
                }
            }
        }

        stage('Stage 3: Build Web Image') {
            steps {
                echo '=== [Stage 3] Building Web Nginx Image ==='
                sh "docker build -t ${DOCKER_USER}/web:${GIT_TAG} ./app-repo/web"
            }
        }

        stage('Stage 4: Build API Image') {
            steps {
                echo '=== [Stage 4] Building API Express Image ==='
                sh "docker build --build-arg APP_VERSION=${GIT_TAG} -t ${DOCKER_USER}/api:${GIT_TAG} ./app-repo/api"
            }
        }

        stage('Stage 5: Push Web Image') {
            steps {
                echo '=== [Stage 5] Pushing Web Image to Docker Hub ==='
                sh "echo '${DOCKERHUB_CREDS_PSW}' | docker login -u '${DOCKER_USER}' --password-stdin"
                sh "docker push ${DOCKER_USER}/web:${GIT_TAG}"
            }
        }

        stage('Stage 6: Push API Image') {
            steps {
                echo '=== [Stage 6] Pushing API Image to Docker Hub ==='
                sh "docker push ${DOCKER_USER}/api:${GIT_TAG}"
            }
        }

        stage('Stage 7: Clone Config Repository') {
            steps {
                echo '=== [Stage 7] Cloning GitOps Config Repository ==='
                // Clean any leftover build directories
                sh "rm -rf config-repo"
                
                // Clone using authenticated HTTPS URL
                sh "git clone https://${GITHUB_CREDS_USR}:${GITHUB_CREDS_PSW}@${CONFIG_REPO_URL} config-repo"
            }
        }

        stage('Stage 8: Update Image Tags inside values.yaml') {
            steps {
                echo "=== [Stage 8] Updating Helm values.yaml tags with: ${GIT_TAG} ==="
                // Safe standard Python file parser to update image tags in values.yaml without dependency failures
                sh """
                python3 -c "
with open('config-repo/dev/values.yaml', 'r') as f:
    lines = f.readlines()

in_web = False
in_api = False
new_lines = []

for line in lines:
    stripped = line.strip()
    if stripped.startswith('web:'):
        in_web = True
        in_api = False
    elif stripped.startswith('api:'):
        in_api = True
        in_web = False
    elif stripped.startswith('ingress:'):
        in_web = False
        in_api = False
    
    if in_web and stripped.startswith('tag:'):
        indent = line.split('tag:')[0]
        line = f'{indent}tag: \"${GIT_TAG}\"\n'
    elif in_api and stripped.startswith('tag:'):
        indent = line.split('tag:')[0]
        line = f'{indent}tag: \"${GIT_TAG}\"\n'
        
    new_lines.append(line)

with open('config-repo/dev/values.yaml', 'w') as f:
    f.writelines(new_lines)
"
                """
                // Show output diff to verify change correctness in the log
                sh "git diff config-repo/dev/values.yaml"
            }
        }

        stage('Stage 9: Commit and Push Config Repository') {
            steps {
                echo '=== [Stage 9] Committing and Pushing config changes back to GitOps ==='
                dir('config-repo') {
                    sh """
                    git config user.name 'Jenkins CI/CD'
                    git config user.email 'jenkins-cicd@viettel.com.vn'
                    git add dev/values.yaml
                    
                    # Check if there are differences before committing to prevent empty commit build failures
                    if ! git diff-index --quiet HEAD --; then
                        git commit -m 'chore(gitops): release version ${GIT_TAG} [skip ci]'
                        git push origin HEAD:main
                    else
                        echo 'No changes in values.yaml to commit.'
                    fi
                    """
                }
            }
        }

        stage('Stage 10: Success Notification') {
            steps {
                echo '=== [Stage 10] Delivery Success Notification ==='
                echo """
                ==============================================================
                🎉 DEPLOYMENT DELIVERY PIPELINE COMPLETED SUCCESSFULLY! 🎉
                ==============================================================
                - Build Version/Tag : ${GIT_TAG}
                - Web Image Pushed  : ${DOCKER_USER}/web:${GIT_TAG}
                - API Image Pushed  : ${DOCKER_USER}/api:${GIT_TAG}
                - Config Status     : Updated values.yaml & pushed to config-repo
                - GitOps Auto-Sync  : ArgoCD is reconciling state...
                ==============================================================
                """
            }
        }
    }

    post {
        always {
            echo 'Pipeline execution cleanup.'
            // Clean local workspace images to avoid disk saturation in Jenkins node
            sh "docker rmi ${DOCKER_USER}/web:${GIT_TAG} ${DOCKER_USER}/api:${GIT_TAG} || true"
        }
        failure {
            echo '❌ PIPELINE FAILED! Please inspect stages above for detail logs.'
        }
    }
}
