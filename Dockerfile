FROM nginx:alpine
COPY index.html app.js hash.js noise.js contour.js /usr/share/nginx/html/
EXPOSE 80
