const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const pool = require('./database');
const { v4: uuidv4 } = require('uuid');
const { saveInstagramData } = require('../controllers/instagramController');

// Função auxiliar para buscar dados do Instagram via Graph API
async function fetchInstagramData(accessToken) {
  const fetch = (await import('node-fetch')).default;

  try {
    // 1. Buscar páginas do Facebook do usuário
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${accessToken}`
    );
    const pagesData = await pagesResponse.json();

    if (pagesData.error) {
      console.error('Erro ao buscar páginas:', pagesData.error);
      return null;
    }

    if (!pagesData.data || pagesData.data.length === 0) {
      console.log('Usuário não possui páginas do Facebook');
      return null;
    }

    // 2. Encontrar página com conta Instagram Business vinculada
    let instagramAccount = null;
    let pageId = null;
    let pageAccessToken = null;

    for (const page of pagesData.data) {
      if (page.instagram_business_account) {
        instagramAccount = page.instagram_business_account;
        pageId = page.id;
        pageAccessToken = page.access_token;
        break;
      }
    }

    if (!instagramAccount) {
      console.log('Nenhuma conta Instagram Business vinculada encontrada');
      return null;
    }

    // 3. Buscar dados do Instagram Business Account
    const igResponse = await fetch(
      `https://graph.facebook.com/v18.0/${instagramAccount.id}?fields=id,username,profile_picture_url,followers_count,media_count&access_token=${pageAccessToken}`
    );
    const igData = await igResponse.json();

    if (igData.error) {
      console.error('Erro ao buscar dados do Instagram:', igData.error);
      return null;
    }

    return {
      instagramId: igData.id,
      username: igData.username,
      profilePicture: igData.profile_picture_url || null,
      followers: igData.followers_count || 0,
      mediaCount: igData.media_count || 0,
      facebookPageId: pageId,
      accessToken: pageAccessToken,
    };
  } catch (error) {
    console.error('Erro ao buscar dados do Instagram:', error);
    return null;
  }
}

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const existingUser = await pool.query(
          'SELECT * FROM influencers WHERE google_id = $1',
          [profile.id]
        );

        if (existingUser.rows.length > 0) {
          return done(null, existingUser.rows[0]);
        }

        const emailCheck = await pool.query(
          'SELECT * FROM influencers WHERE email = $1',
          [profile.emails[0].value]
        );

        if (emailCheck.rows.length > 0) {
          const updated = await pool.query(
            'UPDATE influencers SET google_id = $1, updated_at = NOW() WHERE email = $2 RETURNING *',
            [profile.id, profile.emails[0].value]
          );
          return done(null, updated.rows[0]);
        }

        const id = uuidv4();
        const referralCode = `CHICO_${Math.random().toString(36).substring(2, 8).toUpperCase()}${Date.now().toString(36).substring(-4).toUpperCase()}`;

        const newUser = await pool.query(
          `INSERT INTO influencers (id, name, email, google_id, referral_code, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *`,
          [id, profile.displayName, profile.emails[0].value, profile.id, referralCode]
        );

        return done(null, newUser.rows[0]);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

// Facebook OAuth Strategy (para Instagram Business)
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL,
      profileFields: ['id', 'displayName', 'email'],
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        // Buscar dados do Instagram
        const instagramData = await fetchInstagramData(accessToken);

        // Retornar dados para o callback handler
        return done(null, {
          facebookId: profile.id,
          accessToken,
          instagramData,
          // userId será preenchido pelo handler se houver sessão
        });
      } catch (error) {
        console.error('Erro no Facebook Strategy:', error);
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await pool.query('SELECT * FROM influencers WHERE id = $1', [id]);
    done(null, user.rows[0]);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
