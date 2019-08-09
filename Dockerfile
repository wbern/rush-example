FROM node:10

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
RUN git clone https://github.com/microsoft/rush-example.git .

# RUN node ./common/scripts/install-run-rush.js install --bypass-policy

# RUN node ./common/scripts/install-run-rush.js build

RUN chmod +rx ./docker-scripts/build.sh
RUN sh ./docker-scripts/build.sh

# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
# COPY . .

# EXPOSE 8080
CMD /bin/bash