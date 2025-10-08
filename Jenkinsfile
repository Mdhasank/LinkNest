pipeline {
    agent { label 'builder-node' }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                sh "pwd"
            }
        }

        stage('Install python flask and pip') {
            steps {
                sh '''
                    sudo dnf -y update
                    sudo dnf -y install python3 python3-pip

                    # Install dependencies for the current workspace
                    python3 -m pip install --user -r requirements.txt
                '''
            }
        }

        stage('Prepare app directory and run') {
            steps {
                sh '''
                    TARGET_DIR=/home/ec2-user/LinkNest
                    mkdir -p $TARGET_DIR

                    # Copy app files from workspace to target directory
                    cp ${WORKSPACE}/app.py $TARGET_DIR/
                    cp ${WORKSPACE}/index.html $TARGET_DIR/  
                    cp ${WORKSPACE}/requirements.txt $TARGET_DIR/

                    # Change directory to target dir
                    cd $TARGET_DIR

                    # Install dependencies again here (to make sure requirements are met)
                    python3 -m pip install --user -r requirements.txt

                    # Run the Flask app in background and log output
                    nohup python3 app.py > flask.log 2>&1 &
                '''
            }
        }

    }
}
