pipeline {
    agent {
        kubernetes {
            yaml '''
    apiVersion: v1
    kind: Pod
    spec:
        containers:
            - name: docker
              image: docker:27-cli
              command:
                - cat
              tty: true
              volumeMounts:
                - name: docker-sock
                  mountPath: /var/run/docker.sock

        volumes:
            - name: docker-sock
              hostPath:
                path: /var/run/docker.sock
    '''
        }
    }

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
        DOCKER_USER = "${DOCKERHUB_CREDS_USR}"
    }

    stages {
        stage('Stage 1: Checkout Source') {
            steps {
                echo '=== [Stage 1] Checking out source repository ==='
                checkout scm
            }
        }

        stage('Preflight') {
            steps {
                echo '=== [Preflight] Verifying required build tools ==='
                sh 'git --version'
                container('docker') {
                    sh '''
                        test -S /var/run/docker.sock
                        docker version
                    '''
                }
            }
        }

        stage('Stage 2: Read Git Tag') {
            steps {
                echo '=== [Stage 2] Resolving active Git Tag or Commit ==='
                script {
                    // Capture tag if it exists; fallback to short commit hash for testing branches
                    try {
                        env.GIT_TAG = sh(script: 'git describe --tags --exact-match 2>/dev/null', returnStdout: true).trim()
                        echo "Target Tag detected: ${env.GIT_TAG}"
                    } catch (Exception e) {
                        def commitHash = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
                        env.GIT_TAG = "v1.0.1-${commitHash}"
                        echo "Warning: No exact Git tag found. Falling back to build tag format: ${env.GIT_TAG}"
                    }
                }
            }
        }

        stage('Stage 3: Build Web Image') {
            steps {
                echo '=== [Stage 3] Building Web Nginx Image ==='
                container('docker') {
                    sh "docker build -t ${DOCKER_USER}/vdtops-web:${env.GIT_TAG} ./web"
                }
            }
        }

        stage('Stage 4: Build API Image') {
            steps {
                echo '=== [Stage 4] Building API Express Image ==='
                container('docker') {
                    sh "docker build --build-arg APP_VERSION=${env.GIT_TAG} -t ${DOCKER_USER}/vdtops-api:${env.GIT_TAG} ./api"
                }
            }
        }

        stage('Stage 5: Push Web Image') {
            steps {
                echo '=== [Stage 5] Pushing Web Image to Docker Hub ==='
                container('docker') {
                    sh 'echo "${DOCKERHUB_CREDS_PSW}" | docker login -u "${DOCKER_USER}" --password-stdin'
                    sh "docker push ${DOCKER_USER}/vdtops-web:${env.GIT_TAG}"
                }
            }
        }

        stage('Stage 6: Push API Image') {
            steps {
                echo '=== [Stage 6] Pushing API Image to Docker Hub ==='
                container('docker') {
                    sh "docker push ${DOCKER_USER}/vdtops-api:${env.GIT_TAG}"
                }
            }
        }

        stage('Stage 7: Clone Config Repository') {
            steps {
                echo '=== [Stage 7] Cloning GitOps Config Repository ==='
                // Clean any leftover build directories
                sh "rm -rf config-repo"
                
                // Clone using authenticated HTTPS URL
                withCredentials([usernamePassword(
                    credentialsId: 'github-token',
                    usernameVariable: 'GIT_USER',
                    passwordVariable: 'GIT_TOKEN'
                )]) {
                    sh '''
                        git clone https://${GIT_USER}:${GIT_TOKEN}@github.com/mthang1201/vdtops-config.git config-repo
                    '''
                }
            }
        }

        stage('Stage 8: Update Image Tags inside values.yaml') {
            steps {
                echo "=== [Stage 8] Updating Helm values.yaml tags with: ${env.GIT_TAG} ==="

                sh """
                sed -i '/^web:/,/^api:/ s/^  tag:.*/  tag: "${env.GIT_TAG}"/' config-repo/dev/values.yaml
                sed -i '/^api:/,/^ingress:/ s/^  tag:.*/  tag: "${env.GIT_TAG}"/' config-repo/dev/values.yaml

                git -C config-repo diff dev/values.yaml
                """
            }
        }

        stage('Stage 9: Commit and Push Config Repository') {
            steps {
                echo '=== [Stage 9] Committing and Pushing config changes back to GitOps ==='
                dir('config-repo') {
                    withCredentials([usernamePassword(
                        credentialsId: 'github-token',
                        usernameVariable: 'GIT_USER',
                        passwordVariable: 'GIT_TOKEN'
                    )]) {
                        sh '''
                            set -eu
                            git config user.email "jenkins@example.com"
                            git config user.name "jenkins"

                            if git diff --quiet -- dev/values.yaml; then
                                echo "No config changes to commit; dev/values.yaml already uses ${GIT_TAG}."
                            else
                                git add dev/values.yaml
                                git commit -m "Update image tag to ${GIT_TAG}"
                                git remote set-url origin https://${GIT_USER}:${GIT_TOKEN}@github.com/mthang1201/vdtops-config.git
                                git push origin main
                            fi
                        '''
                    }
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
                - Build Version/Tag : ${env.GIT_TAG}
                - Web Image Pushed  : ${DOCKER_USER}/vdtops-web:${env.GIT_TAG}
                - API Image Pushed  : ${DOCKER_USER}/vdtops-api:${env.GIT_TAG}
                - Config Status     : dev/values.yaml checked and pushed when changed
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
            container('docker') {
                sh '''
                    if [ -n "${GIT_TAG:-}" ]; then
                        docker rmi "${DOCKER_USER}/vdtops-web:${GIT_TAG}" "${DOCKER_USER}/vdtops-api:${GIT_TAG}" || true
                    fi
                '''
            }
        }
        failure {
            echo '❌ PIPELINE FAILED! Please inspect stages above for detail logs.'
        }
    }
}
