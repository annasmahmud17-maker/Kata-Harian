# Kata Harian

Bahan latihan perkataan harian dalam bahasa Melayu. Tiga aktiviti bersama pendamping menggunakan bank v2.0: 100 kad (98 perkataan unik), lima kategori dan empat tahap bagi setiap kategori. Setiap tahap mengandungi lima kad. Pasar kini dinamakan Makanan & Minuman. Rakaman asal 30 perkataan dikekalkan; 68 perkataan baharu menunggu rakaman.

## Cuba pada komputer

Pasang Python 3. Ekstrak ZIP dan jalankan arahan ini dari **folder induk** yang mengandungi folder `kata-harian`.

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Buka [http://127.0.0.1:8000/kata-harian/](http://127.0.0.1:8000/kata-harian/). Pelayan tempatan membolehkan modul JavaScript dan service worker berfungsi. Kod menggunakan HTML, CSS dan JavaScript biasa, dengan semua aset dihoskan bersama aplikasi.

## Terbitkan di GitHub Pages

1. Di repositori ini, buka **Settings → Pages**.
2. Di **Build and deployment**, pilih **Deploy from a branch**. Pilih **main**, pilih **/(root)**, kemudian **Save**.
3. Tunggu sehingga kerja penempatan di **Actions** selesai. Buka [Kata Harian](https://annasmahmud17-maker.github.io/Kata-Harian/) atau pilih **Visit site**. Hidupkan **Enforce HTTPS** apabila pilihan itu tersedia.

[Rujukan GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## Pasang dan semak pada peranti

- **Android Chrome** — Buka laman HTTPS, pilih **Pasang Aplikasi** dan ikuti tindakan pemasangan Chrome. Jika tindakan itu belum tersedia, buka menu ⋮ dan cari **Install app**, **Install and create shortcut** atau **Add to Home screen**. [Bantuan Chrome](https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid)
- **iPhone atau iPad Safari** — Buka menu **Share**, pilih **Add to Home Screen**, hidupkan **Open as Web App** jika dipaparkan, kemudian tekan **Add**. [Panduan Apple](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios)
- Pastikan ikon KH kelihatan penuh. Buka dari skrin utama dan semak bahawa aplikasi bermula di `/Kata-Harian/` serta pilihan **Pasang Aplikasi** disembunyikan.
- Buka dalam talian supaya service worker boleh menyimpan gambar dan rakaman yang dibekalkan. Putar peranti ketika petak dibuka. Kemudian tutup aplikasi, hidupkan mod kapal terbang dan buka semula melalui ikon. Cuba satu pusingan dalam kedua-dua aktiviti dan ulang rakaman apabila media rintis telah ditambah.

## Media dan penyelenggaraan

- Lihat [MEDIA.md](MEDIA.md) untuk senarai gambar dan rakaman mengikut kad.
- Isi medan `wordAudio` dan `promptAudio` dalam `data.js` dengan laluan relatif fail yang sudah dimasukkan. Service worker mengambil senarai media daripada fail ini.
- Setiap kali fail aplikasi atau aset berubah, naikkan versi `cacheName` dalam `sw.js`. Tutup tab atau tetingkap aplikasi lama supaya service worker baharu dapat diaktifkan. Cache versi lama bagi skop ini akan dipadamkan semasa pengaktifan.
- Untuk tambah kad, kekalkan ejaan standard, isi suku kata yang bercantum tepat dengan ejaan, dan pilih gambar pengalih yang mudah dibezakan. Petak menyokong perkataan 2–8 huruf dan paparan jawapan menyokong satu hingga tiga suku kata. Rujuk [PRPM Dewan Bahasa dan Pustaka](https://prpm.dbp.gov.my/).

## Ujian

- `npm test` menjalankan ujian susunan bank, suku kata, pengalih dan keunikan kedudukan perkataan serta simulasi cache luar talian menggunakan Node.js.
- `python3 tests/browser.py` menjalankan pusingan lima kad dan ujian input sentuh, tetikus, papan kekunci, susun atur, cache gambar dan audio. Gunakan Python Playwright, Chromium serta FFmpeg. Tetapkan `CHROMIUM_PATH` jika Chromium dipasang pada laluan lain. Skrip menghasilkan nada MP3 sementara untuk menguji ulang main dan cache. Nada itu hanya digunakan dalam salinan ujian sementara.
