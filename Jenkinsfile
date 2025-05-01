// Jenkinsfile для проекта holograms.media
pipeline {
    agent any
    triggers { githubPush() }
    options { 
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timestamps() 
    }
    stages {
        stage('Checkout') { 
            steps { 
                echo "Checking out..."
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
                            echo "Running JS/Frontend Lint check..."
                            sh "npm run lint"
                        } else { 
                            echo "Lint script not found, skipping JS lint..." 
                        }
                    }
                    // Добавь сюда проверку Python линтером, если он настроен
                }
            }
        }
        stage('Send Build Status') {
            steps {
                script {
                    def status = currentBuild.currentResult
                    def timestamp = new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", TimeZone.getTimeZone('UTC'))
                    def build_url = env.BUILD_URL
                    
                    // Отправляем данные на эндпоинт /tria/save_logs
                    sh """
                        curl -X POST http://localhost:3000/tria/save_logs \\
                        -H 'Content-Type: application/json' \\
                        -d '{
                            "status": "${status}",
                            "build_url": "${build_url}",
                            "timestamp": "${timestamp}"
                        }'
                    """
                }
            }
        }
        stage('Success') { 
            steps { 
                echo "Pipeline completed successfully!" 
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