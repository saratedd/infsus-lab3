const supertest = require('supertest');
const chai = require('chai');
const cheerio = require('cheerio');
const app = require('../server'); // path to your app.js/server.js file

const expect = chai.expect;
const request = supertest(app);

describe('GET /korisnici', () => {
    it('It should fetch all users', async () => {
        const response = await request.get('/korisnici');
        expect(response.status).to.eql(200);

        let $ = cheerio.load(response.text);
        let rows = $('body').find('.row'); // assuming each user is wrapped with a div of class 'row'

        expect(rows.length).to.be.above(0); // change according to your expectation
    });
});

describe('POST /korisnici/:oib/delete', () => {
  const userOib = '69326424006';
  // INSERT INTO korisnik(OIB, isAdmin, ime, prezime, email, lozinka, idZaduzenja)
  // VALUES ('69326424006', b'0', 'Marija', 'Jukić', 'marija.jukic@mail.com', 'MJ1234Loz', 2);

  it('It should delete a user with given oib', async () => {
      // Delete the user
      response = await request.post(`/korisnici/${userOib}/delete`);
      expect(response.status).to.eql(302); // A redirect should return a 302 status

      // Check that the user no longer exists
      response = await request.get('/korisnici');
      expect(response.status).to.eql(200);

      $ = cheerio.load(response.text);
      deleteUserFormAction = $(`form[action="/korisnici/${userOib}/delete"]`);
      userExists = deleteUserFormAction.length > 0;
      expect(userExists).to.be.false;
  });
});