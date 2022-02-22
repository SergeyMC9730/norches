PLUGIN_NAME=wip
MAVEN_PATH=maven
download:
	rm ${MAVEN_PATH} -rfv
	sudo apt-get update
	sudo apt-get install wget unzip openjdk-17-jdk
	wget "https://dlcdn.apache.org/maven/maven-3/3.8.4/binaries/apache-maven-3.8.4-bin.zip" -O ${MAVEN_PATH}.zip
	unzip ${MAVEN_PATH}.zip
	rm ${MAVEN_PATH}.zip
	mv apache-maven-* ${MAVEN_PATH}
compile:
	${MAVEN_PATH}/bin/mvn install -f "${shell pwd}/${PLUGIN_NAME}/pom.xml"
	${MAVEN_PATH}/bin/mvn package shade:shade -f "${shell pwd}/${PLUGIN_NAME}/pom.xml"
all: download compile
