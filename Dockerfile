FROM node:12 AS build-image
WORKDIR /build
COPY . ./

RUN npm install
RUN npm run build
RUN npm pack

FROM node:12 AS run-image

ENV DEBUG "*"
ENV NODE_ENV "production"

COPY --from=build-image /build/*.tgz /
RUN npm install /*.tgz

WORKDIR node_modules/@teleport-park/tracker-tng

CMD npm start

FROM node:12 AS run-encrypted
