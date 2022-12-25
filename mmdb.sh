wget https://download.db-ip.com/free/dbip-country-lite-2022-12.mmdb.gz
gzip -d dbip-country-lite-2022-12.mmdb.gz

mv dbip-country-lite-2022-12.mmdb  src/mmdb.db
