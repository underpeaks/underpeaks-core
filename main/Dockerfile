# Base image
FROM node:20-bullseye

# Set working directory inside container
WORKDIR /app

# Copy package files first for caching
COPY package.json package-lock.json tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source code into container
COPY app ./app
COPY components ./components
COPY nxf-ui ./nxf-ui

# Ensure globals.css is in the right place
COPY app/globals.css ./app/globals.css

# Build the Next.js app
RUN npm run build

# Expose Next.js default port
EXPOSE 3000

# Start the app
CMD ["npm", "start"]
