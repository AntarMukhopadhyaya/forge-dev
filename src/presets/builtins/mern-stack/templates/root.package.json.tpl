{
	"name": "{{project}}",
	"private": true,
	"scripts": {
		"dev": "concurrently \"npm run dev --prefix backend\" \"npm run dev --prefix frontend\""
	}
}
