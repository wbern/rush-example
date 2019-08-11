# eg. "scratch" when starting a new branch (default), or eg. "wbern/rush-example:master"
ARG CACHE_IMAGE="scratch"
# ARG CACHE_IMAGE="wbern/rush-example:master"
ARG SOURCE_BRANCH="master"

# To make the previously pushed build available as build cache, respecting branch name
FROM ${CACHE_IMAGE} AS cache

WORKDIR /usr/src/app

FROM node:10

# Reuse the global --build-arg
ARG CACHE_IMAGE
ARG SOURCE_BRANCH

# Create app directory
WORKDIR /usr/src/app

# Get cached artifacts
COPY --from=cache /usr/src/app /usr/src/app

# Set it to use latest code, ignoring what's in gitignore
RUN ls -l
# RUN git remote add origin https://github.com/wbern/rush-example.git
RUN echo ${CACHE_IMAGE}


RUN [ -d /usr/src/app/.git ] && echo "Found" || echo "Not found"

# If the cache image is from "scratch", do git init etc.
RUN [ -d /usr/src/app/.git ] && \
    # cache file structure with .git directory exists
    (git fetch && git reset --hard origin/${SOURCE_BRANCH}) || \
    # .git directory did not exist, start with a new git init
    (git init && git remote add origin https://github.com/wbern/rush-example.git)

RUN node ./common/scripts/install-run-rush.js install --bypass-policy

RUN node ./common/scripts/install-run-rush.js build

# RUN chmod +rx ./docker-scripts/build.sh
# RUN sh ./docker-scripts/build.sh

# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
# COPY . .

# EXPOSE 8080
CMD /bin/bash