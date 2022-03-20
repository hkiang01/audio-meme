FROM node:17.3.0

# Create app directory
WORKDIR /app

# rust required by prism-media
# remove when https://github.com/magiclen/node-crc/issues/9 resolved
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs > install-rust.sh \
  && chmod +x install-rust.sh \
  && ./install-rust.sh -y
ENV PATH="/root/.cargo/bin:$PATH"

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install

# Bundle app source
COPY . .

CMD ["npm", "run-script", "start"]