const express = require("express");
const {program} = require("commander");
const fs = require("fs");
const http = require("http");
const bodyParser = require('body-parser');


const app = express();
app.use(express.text());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static('public'));
program
    .option('-ht, --host <path>', 'Server host')
    .option('-p, --port <path>', 'Server port')
    .option('-c, --cache <path>', 'Cache directory')
program.parse();
const options = program.opts();

if (!options.host || !options.port || !options.cache) {
    console.error('Missing required arguments');
    process.exit(1);
}

app.post('/write', (req, res) => {
    const noteName = req.body.note_name;
    const noteText = req.body.note;
    const filePath = `./cache/${noteName}.txt`;

    fs.writeFile(filePath, noteText, (err) => {
        if (err) {
            if (err.code === 'EEXIST') {
                res.status(400).send('Note already exists');
            } 
        } else {
            res.status(201).send('Note created successfully');
        }
    });
});

app.get('/notes/:noteName', (req, res) => {
    const noteName = req.params.noteName;
    const filePath = `./cache/${noteName}.txt`;

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.status(404).send('Note not found');
            } else {
                console.error(err);
                res.status(500).send('Internal server error');
            }
        } else {
            res.send(data);
        }
    });
});

app.get('/notes', (req, res) => {
    fs.readdir(options.cache, (err, files) => {
        if (err) {
            console.error(err);
            res.status(500).send('Internal server error');
        } else {
            const notes = files.map(file => {
                const name = file.replace('.txt', '');
                return fs.promises.readFile(`./cache/${file}`, 'utf8')
                    .then(text => ({ name, text }))
                    .catch(err => {
                        console.error(`Error reading file ${file}:`, err);
                        return null;
                    });
            });

            Promise.all(notes)
                .then(notes => {
                    const validNotes = notes.filter(note => note !== null);
                    res.json(validNotes);
                })
                .catch(err => {
                    console.error('Error processing notes:', err);
                    res.status(500).send('Internal server error');
                });
        }
    });
});

app.put('/notes/:noteName', async (req, res) => {
    const noteName = req.params.noteName; // Отримуємо ім'я нотатки з URL
    const filePath = `${options.cache}/${noteName}.txt`; // Шлях до файлу

    try {
        // Перевіряємо, чи існує файл
        if (!fs.existsSync(filePath)) {
            return res.status(404).send('Note not found');
        }

        // Перетворюємо тіло запиту в рядок (якщо необхідно)
        const data = typeof req.body === 'object' ? JSON.stringify(req.body, null, 2) : String(req.body);

        // Записуємо нові дані у файл
        await fs.promises.writeFile(filePath, data, 'utf8');

        res.sendStatus(204); // Успішна відповідь без контенту
    } catch (err) {
        console.error('Error updating note:', err);
        res.status(500).send('Internal server error'); // Внутрішня помилка сервера
    }
});

app.delete('/notes/:noteName', async (req, res) => {
    const noteName = req.params.noteName; // Отримуємо ім'я нотатки
    const filePath = `${options.cache}/${noteName}.txt`; // Шлях до файлу

    try {
        // Перевіряємо, чи існує файл
        if (!fs.existsSync(filePath)) {
            return res.status(404).send('Note not found'); // Якщо файл не знайдено
        }

        // Видаляємо файл
        await fs.promises.unlink(filePath);
        res.sendStatus(204); // Успішне видалення
    } catch (err) {
        console.error('Error deleting note:', err); // Лог помилки
        res.status(500).send('Internal server error'); // Внутрішня помилка сервера
    }
});

app.get('/UploadForm.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'UploadForm.html'));
});


app.listen(options.port, options.host, () => {
    console.log(`Server started: http://${options.host}:${options.port}`);
});