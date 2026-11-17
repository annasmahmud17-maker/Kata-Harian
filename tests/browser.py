"""Run with Python Playwright and Chromium installed. No network dependencies at runtime."""
import functools
import http.server
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import threading

from playwright.sync_api import expect, sync_playwright

APP = Path(__file__).resolve().parents[1]


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def serve(root):
    handler = functools.partial(QuietHandler, directory=root)
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, f"http://127.0.0.1:{server.server_port}/kata-harian/"


def button(page, title):
    return page.get_by_role("button", name=title, exact=True)


def enter(page, activity, theme="Dapur", round_number=1, count=2, read=False):
    page.get_by_role("button", name=activity, exact=False).first.click()
    if button(page, "Mula / Start").count():
        expect(page.locator(".guide [lang=en]").first).to_be_visible()
        button(page, "Mula / Start").click()
    button(page, theme).click()
    button(page, f"Tahap {round_number} · 5 kad").click()
    if activity != "Sebut Nama":
        page.get_by_role("radio", name=str(count), exact=True).check()
        if read:
            page.get_by_role("radio", name="Baca", exact=True).check()
        button(page, "Mula pusingan").click()


def path(page, word):
    return page.evaluate("""async word => {
      const {occurrences} = await import('./puzzle.js');
      const cells = [...document.querySelectorAll('.cell')];
      return occurrences(cells.map(cell => cell.textContent), Math.sqrt(cells.length), word.toUpperCase())[0];
    }""", word)


def touch(session, point, kind):
    x, y = point
    session.send("Input.dispatchTouchEvent", {
        "type": kind,
        "touchPoints": [] if kind == "touchEnd" else [{"x": x, "y": y}],
    })


def cell_point(page, index):
    box = page.locator(f'[data-cell="{index}"]').bounding_box()
    return box["x"] + box["width"] / 2, box["y"] + box["height"] / 2


def test_phone(browser, url):
    context = browser.new_context(viewport={"width": 360, "height": 800}, is_mobile=True, has_touch=True)
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(url)
    page.evaluate("navigator.serviceWorker.ready")
    page.wait_for_function("navigator.serviceWorker.controller !== null")
    expect(page.locator(".logo")).to_be_visible()
    button(page, "Pasang Aplikasi").click()
    expect(page.locator("#install-help")).to_contain_text("Open as Web App")
    expect(page.locator("#install-help")).to_contain_text("Install and create shortcut")
    enter(page, "Sebut Nama")
    expect(page.get_by_role("heading", name="Apa ini?")).to_be_visible()
    for i, word in enumerate(("sudu", "garpu", "pisau", "cawan", "teko")):
        button(page, "Jawapan").click()
        expect(page.locator("#answer")).to_be_hidden()
        assert page.evaluate("document.documentElement.scrollWidth === innerWidth")
        assert page.locator(".picture").bounding_box()["y"] < page.locator("#grid").bounding_box()["y"]
        if i == 0:
            expect(page.locator(".cell")).to_have_count(64)
            button(page, "Petunjuk").click()
            button(page, "Tunjuk Huruf Pertama").click()
            expect(page.locator(".cell.hint")).to_have_count(1)
            button(page, "Tunjuk Perkataan").click()
            expect(page.locator("#aid")).to_have_text(word)
            button(page, "5 × 5").click()
            expect(page.locator(".cell")).to_have_count(25)
            button(page, "8 × 8").click()
            pos = path(page, word)
            page.locator("#grid").scroll_into_view_if_needed()
            session = context.new_cdp_session(page)
            touch(session, cell_point(page, pos[0]), "touchStart")
            for cell in pos[1:]:
                touch(session, cell_point(page, cell), "touchMove")
            touch(session, cell_point(page, pos[-1]), "touchEnd")
            expect(page.locator(".cell.selected")).to_have_count(len(word))
            expect(page.locator(".answer-word .red")).to_have_text("su")
            expect(page.locator(".answer-word .syllable-word > span").nth(1)).to_have_text("du")
            assert page.locator(".answer-word .red").evaluate("e => getComputedStyle(e).color") == "rgb(157, 25, 42)"
            assert page.locator(".answer-word .syllable-word > span").nth(1).evaluate("e => getComputedStyle(e).color") == "rgb(0, 0, 0)"
            assert page.locator("#grid").bounding_box()["y"] < page.locator("#answer").bounding_box()["y"]
        elif i == 1:
            pos = path(page, word)
            page.locator("#grid").scroll_into_view_if_needed()
            page.locator(f'[data-cell="{pos[0]}"]').tap()
            page.locator(f'[data-cell="{pos[1]}"]').tap()
            expect(page.locator("#feedback")).to_have_text("Cuba lagi.")
            page.locator(f'[data-cell="{pos[0]}"]').tap()
            page.locator(f'[data-cell="{pos[-1]}"]').tap()
        elif i == 2:
            pos = path(page, word)
            page.locator(f'[data-cell="{pos[0]}"]').focus()
            page.keyboard.press("Enter")
            key = "ArrowRight" if pos[1] - pos[0] == 1 else "ArrowDown"
            for _ in pos[1:]:
                page.keyboard.press(key)
            page.keyboard.press("Enter")
        else:
            if i == 3:
                button(page, "Petunjuk").click()
                expect(button(page, "5 × 5")).to_be_disabled()
                expect(page.locator("#size-help")).to_be_visible()
            button(page, "Langkau").click()
        expect(page.get_by_role("img", name=word, exact=True)).to_be_visible()
        button(page, "Seterusnya").click()
    expect(page.get_by_role("heading", name="Pusingan selesai")).to_be_visible()
    button(page, "Cuba pusingan ini dalam Pilih Gambar").click()
    button(page, "Mula / Start").click()
    button(page, "Mula pusingan").click()
    for i, word in enumerate(("sudu", "garpu", "pisau", "cawan", "teko")):
        photos = page.locator(".photo-choice")
        expect(photos).to_have_count(2)
        correct = photos.nth(i % 2)
        assert correct.get_attribute("data-value") == word
        expect(button(page, "Dengar Semula")).to_be_enabled()
        assert photos.nth(0).bounding_box()["x"] < photos.nth(1).bounding_box()["x"]
        if i == 0:
            photos.nth(1).tap()
            expect(page.locator("#feedback")).to_have_text("Cuba lagi.")
        if i == 2:
            button(page, "Langkau").click()
            expect(page.locator("#feedback")).to_have_text("Kad dilangkau.")
        else:
            correct.tap()
            expect(page.locator("#feedback")).to_have_text(f"Pilihan tepat. {word}.")
        expect(photos).to_have_count(2)
        button(page, "Seterusnya").click()
    expect(page.get_by_role("heading", name="Pusingan selesai")).to_be_visible()
    button(page, "Ulang pusingan").click()
    expect(page.locator(".context")).to_contain_text("Kad 1 daripada 5")

    manifest = page.evaluate("fetch('./app.webmanifest').then(r => r.json())")
    urls = [icon["src"] for icon in manifest["icons"]] + ["./assets/icons/kh-180.png", "./assets/icons/kh-32.png"]
    assert page.evaluate("""async paths => {
      const images = await Promise.all(paths.map(path => new Promise(resolve => {
        const image = new Image();
        image.onload = () => resolve([image.naturalWidth, image.naturalHeight]);
        image.onerror = () => resolve([]);
        image.src = path;
      })));
      return JSON.stringify(images) === JSON.stringify([[192,192],[512,512],[512,512],[180,180],[32,32]]);
    }""", urls)
    assert manifest["scope"] == manifest["start_url"] == "./"
    assert manifest["display"] == "standalone" and "orientation" not in manifest
    cached = page.evaluate("""async () => {
      const name = (await caches.keys()).find(key => key.startsWith('kata-harian:'));
      const cache = await caches.open(name);
      return (await cache.keys()).filter(r => r.url.includes('/assets/photos/')).length;
    }""")
    assert cached == 30
    context.set_offline(True)
    page.reload()
    expect(page.locator("#offline")).to_be_visible()
    enter(page, "Sebut Nama", "Dapur", 2)
    page.wait_for_function("document.querySelector('[data-media]').naturalWidth > 0")
    button(page, "Kata Harian, ke laman utama").click()
    enter(page, "Pilih Gambar", "Pasar", 2)
    page.wait_for_function("[...document.querySelectorAll('[data-media]')].every(i => i.naturalWidth > 0)")
    assert not errors, errors
    context.close()


def test_tablet(browser, url):
    page = browser.new_page(viewport={"width": 1024, "height": 768})
    page.goto(url)
    enter(page, "Sebut Nama", "Rumah", 2)
    button(page, "Jawapan").click()
    picture = page.locator(".picture").bounding_box()
    grid = page.locator("#grid").bounding_box()
    assert picture["x"] + picture["width"] < grid["x"]
    pos = path(page, "langsir")
    page.locator("#grid").scroll_into_view_if_needed()
    page.mouse.move(*cell_point(page, pos[0]))
    page.mouse.down()
    for i in pos[1:]:
        page.mouse.move(*cell_point(page, i), steps=3)
    page.mouse.up()
    expect(page.get_by_role("img", name="langsir")).to_be_visible()
    page.set_viewport_size({"width": 768, "height": 1024})
    expect(page.get_by_role("img", name="langsir")).to_be_visible()
    assert page.locator(".picture").bounding_box()["y"] < page.locator("#grid").bounding_box()["y"]
    page.close()


def test_responsive_choices(browser, url):
    page = browser.new_page(viewport={"width": 320, "height": 568})
    page.goto(url)
    for activity, selector in (("Pilih Gambar", ".photo-choice"), ("Pilih Perkataan", ".word-choice")):
        for count in (2, 4, 6):
            button(page, "Kata Harian, ke laman utama").click()
            page.set_viewport_size({"width": 320, "height": 568})
            enter(page, activity, count=count, read=activity == "Pilih Gambar" and count == 4)
            options = page.locator(selector)
            expect(options).to_have_count(count)
            order = options.evaluate_all("items => items.map(item => item.dataset.value)")
            assert len(set(order)) == count
            if activity == "Pilih Perkataan":
                assert len(set(item.bounding_box()["x"] for item in options.all())) == 1
            helper = "Tunjuk Gambar" if activity == "Pilih Perkataan" else "Tunjuk Perkataan"
            if button(page, helper).count():
                expect(page.locator("#choice-hint")).to_be_hidden()
                button(page, helper).click()
                expect(page.locator("#choice-hint")).to_be_visible()
            else:
                expect(page.locator(".choice-target")).to_have_text("sudu")
            for width, height in ((320, 568), (568, 320), (1024, 768)):
                page.set_viewport_size({"width": width, "height": height})
                assert options.evaluate_all("items => items.map(item => item.dataset.value)") == order
                assert options.evaluate_all("items => items.every(item => item.getBoundingClientRect().bottom <= innerHeight)")
            for word in ("sudu", "garpu", "pisau", "cawan", "teko"):
                page.locator(f'{selector}[data-value="{word}"]').click()
                expect(page.locator("#feedback")).to_contain_text(f"Pilihan tepat. {word}")
                button(page, "Seterusnya").click()
            expect(page.get_by_role("heading", name="Pusingan selesai")).to_be_visible()
    page.close()


def test_audio_fixture(browser, root):
    fixture_root = root / "audio-fixture"
    target = fixture_root / "kata-harian"
    shutil.copytree(APP, target)
    source = target / "data.js"
    source.write_text(source.read_text().replace("wordAudio: `./assets/audio/${word}.mp3`,", "wordAudio: word === 'sudu' ? './assets/audio/fixture.mp3' : null,")
                      .replace("promptAudio: `./assets/audio/pilih-${word}.mp3`,", "promptAudio: word === 'sudu' ? './assets/audio/fixture.mp3' : null,"))
    audio_file = target / "assets/audio/fixture.mp3"
    audio_file.parent.mkdir(exist_ok=True)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-f", "lavfi", "-i", "sine=frequency=440:duration=2", str(audio_file)], check=True)
    server, url = serve(fixture_root)
    context = browser.new_context()
    context.add_init_script("""window.testAudio = [];
      const Base = window.Audio;
      window.Audio = function(url) { const item = new Base(url); window.testAudio.push(item); return item; };""")
    page = context.new_page()
    page.goto(url)
    page.wait_for_function("navigator.serviceWorker.controller !== null")
    context.set_offline(True)
    enter(page, "Pilih Gambar")
    for n in (2, 3):
        button(page, "Dengar Semula").click()
        page.wait_for_function(f"window.testAudio.length === {n} && window.testAudio.at(-1).currentTime > 0")
    assert page.evaluate("window.testAudio[0].paused")
    range_result = page.evaluate("""async () => {
      const response = await fetch('./assets/audio/fixture.mp3', {headers: {Range: 'bytes=0-1'}});
      return [response.status, (await response.arrayBuffer()).byteLength];
    }""")
    assert range_result == [206, 2]
    button(page, "Kata Harian, ke laman utama").click()
    enter(page, "Sebut Nama")
    button(page, "Jawapan").click()
    page.wait_for_function("window.testAudio.length === 4 && window.testAudio.at(-1).currentTime > 0")
    letters = page.locator(".cell").all_text_contents()
    button(page, "Dengar Semula").click()
    page.wait_for_function("window.testAudio.length === 5 && window.testAudio.at(-1).currentTime > 0")
    assert page.locator(".cell").all_text_contents() == letters
    button(page, "Langkau").click()
    button(page, "Dengar Jawapan").click()
    page.wait_for_function("window.testAudio.length === 6 && window.testAudio.at(-1).currentTime > 0")
    context.close()
    server.shutdown()


if __name__ == "__main__":
    with sync_playwright() as playwright, tempfile.TemporaryDirectory() as temp:
        shutil.copytree(APP, Path(temp) / "kata-harian", ignore=shutil.ignore_patterns(".git"))
        server, url = serve(temp)
        executable = os.environ.get("CHROMIUM_PATH") or shutil.which("chromium")
        browser = playwright.chromium.launch(executable_path=executable)
        test_phone(browser, url)
        print("PASS phone touch, five-card rounds, puzzle controls, icons and offline images")
        test_tablet(browser, url)
        print("PASS landscape tablet, mouse drag and rotation")
        test_responsive_choices(browser, url)
        print("PASS all photo and word choice counts, reading mode, hints and responsive rotation")
        test_audio_fixture(browser, Path(temp))
        print("PASS offline answer and prompt replay using a temporary audio fixture")
        browser.close()
    server.shutdown()
