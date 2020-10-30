FROM ubuntu:latest
RUN mkdir -p /casa-corrently
WORKDIR /casa-corrently
COPY docker.config.json ./
COPY docker.install.sh ./
COPY start.sh ./
RUN chmod 755 ./docker.install.sh
RUN chmod 755 ./start.sh
RUN ./docker.install.sh
EXPOSE 3000
CMD ["/bin/bash","./start.sh"]
