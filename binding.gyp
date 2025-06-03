
{
  "targets": [
    {
      "target_name": "windowprotection",
      "sources": [ "windowprotection.cpp" ],
      "conditions": [
        ["OS=='win'", {
          "libraries": [ "-luser32" ]
        }]
      ]
    }
  ]
}