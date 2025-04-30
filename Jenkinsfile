pipeline {
    agent any
    triggers {
        githubPush()
    }
    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timestamps()
    }
    stages {
        stage('Checkout') {
            steps {
                echo "Checking out code from ${env.BRANCH_NAME}..."
                checkout scm
            }
        }
        stage('Setup Environment') {
            steps {
                script {
                    echo "Setting up Python venv..."
                    sh "python3.12 -m venv venv"
                    sh ". venv/bin/activate && pip install --upgrade pip"
                    sh ". venv/bin/activate && pip install -r backend/requirements.txt"
                    if (fileExists('package.json')) {
                        echo "Setting up Node.js dependencies..."
                        sh "npm install"
                    }
                }
            }
        }
        stage('Lint Check') {
            steps {
                script {
                    if (fileExists('package.json')) {
                        def pkg = readJSON file: 'package.json'
                        if (pkg.scripts && pkg.scripts.lint) {
                            echo "Running JS/Frontend Lint check (npm run lint)..."
                            sh "npm run lint"
                        } else {
                            echo "Lint script not found in package.json, skipping JS lint..."
                        }
                    }
                }
            }
        }
        stage('Send Logs to Tria') {
            steps {
                script {
                    def buildStatus = currentBuild.currentResult ?: 'UNKNOWN'
                    def buildUrl = env.BUILD_URL ?: 'URL_NOT_AVAILABLE'
                    def timestamp = new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", TimeZone.getTimeZone('UTC'))

                    echo "[INFO] Sending build logs to Tria Backend..."
                    echo "[INFO] Status: ${buildStatus}, URL: ${buildUrl}, Timestamp: ${timestamp}"

                    // Формируем JSON данные (экранируем кавычки для sh)
                    // def jsonData = "{\"status\": \"${buildStatus}\", \"build_url\": \"${buildUrl}\", \"timestamp\": \"${timestamp}\"}"

                    // Отправляем curl запрос с использованием heredoc для JSON
                    sh (script: """
                        curl -X POST http://localhost:3000/tria/save_logs \
                             -H 'Content-Type: application/json' \
                             --connect-timeout 5 --max-time 10 --silent --show-error \
                             -d @- \
                        <<EOF
                        {
                            "status": "${buildStatus}",
                            "build_url": "${buildUrl}",
                            "timestamp": "${timestamp}"
                        }
EOF
                        || echo '[ERROR] Failed to send logs to Tria Backend at http://localhost:3000/tria/save_logs'
                    """, returnStatus: true) // returnStatus: true, чтобы пайплайн не падал при ошибке curl
                }
            }
        }
        stage('Success') {
            steps {
                echo "Pipeline completed successfully for branch ${env.BRANCH_NAME}!"
            }
        }
    }
    post {
        always {
            echo 'Pipeline finished.'
        }
        success {
            echo 'Build successful!'
        }
        failure {
            echo 'Build failed!'
        }
    }
} 